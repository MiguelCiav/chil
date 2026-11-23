import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from '../../../components/Toast';

import {
  getHierarchyData,
  createBatchWithMembers,
  getMemberStatus,
  getScraperSessionStatus,
  isScraperSessionError,
  assignBatchRecognitionCodes
} from '../api';
import { Region, District, ScoutGroup, ScoutMember } from '../types';
import { getAllRecognitionTypes, RecognitionType } from '../../recognitions';
import { useAuth } from '../../auth';
import { useScraperSettings } from '../../../context/ScraperSettingsContext';
import {
  useWalkthrough,
  WalkthroughOverlay,
  WalkthroughHelpButton
} from '../../../components/walkthrough';

import {
  Step1DataLoad,
  Step2ReviewConfirm,
  WizardStepper,
  ScraperAlertModals,
  NEW_BATCH_WIZARD_TOUR_STEPS,
  Step1DataLoadFormData,
  parseCedulasFromText,
  buildScrapedMemberRecord,
  buildUnregisteredMemberRecord
} from './wizard';

const VERIFICATION_POOL_CONCURRENCY = 4;

export const NewBatchWizard: React.FC = () => {
  const navigate = useNavigate();
  const { sessionStatus, refreshSessionStatus, setSessionStatus } = useScraperSettings();
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [batchMetadata, setBatchMetadata] = useState<{
    comment: string;
    recognitionType: string;
  }>({
    comment: '',
    recognitionType: ''
  });

  // Hierarchy & Recognition Catalog State
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [groups, setGroups] = useState<ScoutGroup[]>([]);
  const [recognitionTypes, setRecognitionTypes] = useState<RecognitionType[]>([]);
  const [loadingHierarchy, setLoadingHierarchy] = useState(true);

  // Verification & Progress State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyProgress, setVerifyProgress] = useState({ current: 0, total: 0 });
  const [showAuthAlert, setShowAuthAlert] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const triggerWarningToast = (msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    setShowToast(true);
    toastTimeoutRef.current = setTimeout(() => {
      setShowToast(false);
    }, 4000);
  };

  // Step 2 State
  const [membersList, setMembersList] = useState<ScoutMember[]>([]);

  const { user } = useAuth();

  const {
    isOpen: isTourOpen,
    currentStep: tourCurrentStep,
    currentStepIndex,
    totalSteps,
    targetRect,
    startTour,
    nextStep,
    prevStep,
    skipTour
  } = useWalkthrough({
    tourId: 'new-batch-wizard-tour',
    steps: NEW_BATCH_WIZARD_TOUR_STEPS,
    autoStart: true,
    userId: user?.uid
  });

  // Load Hierarchy & Recognition Data
  useEffect(() => {
    Promise.all([
      getHierarchyData(),
      getAllRecognitionTypes(user?.uid)
    ])
      .then(([hierarchy, recTypes]) => {
        setRegions(hierarchy.regions);
        setDistricts(hierarchy.districts);
        setGroups(hierarchy.groups);
        setRecognitionTypes(recTypes);
      })
      .catch((err) => {
        console.error('Error loading initial batch metadata:', err);
      })
      .finally(() => {
        setLoadingHierarchy(false);
      });
  }, [user?.uid]);

  const handleScraperSessionFailure = (err: Error) => {
    const isNotConfigured =
      isScraperSessionError(err) && err.reason === 'SCRAPER_NOT_CONFIGURED';
    setSessionStatus((prev) => ({
      connected: false,
      status: isNotConfigured ? 'none' : 'expired',
      impeesaEmail: isNotConfigured ? null : (prev?.impeesaEmail ?? null),
      updatedAt: new Date().toISOString()
    }));
    if (isNotConfigured) {
      setShowAuthAlert(true);
    } else {
      setAuthError(err.message);
    }
  };

  const verifySingleCedulaInMemory = async (cedula: string): Promise<ScoutMember> => {
    try {
      const res = await getMemberStatus(cedula);
      return buildScrapedMemberRecord(cedula, res, undefined, undefined, null, user?.uid);
    } catch (scrapeErr) {
      if (isScraperSessionError(scrapeErr)) {
        throw scrapeErr;
      }
      const errStr = scrapeErr instanceof Error ? scrapeErr.message : String(scrapeErr);
      if (!errStr.includes('No registrado')) {
        triggerWarningToast(`Error de red al verificar la cédula ${cedula}`);
      }
      return buildUnregisteredMemberRecord(cedula, 'young', 'tropa', null, user?.uid);
    }
  };

  // Step 1 Submission: Validate, Check Context Session, Probe-First + Pool-of-4 Delta Scrape (0 Firestore Writes)
  const onSubmitStep1 = async (data: Step1DataLoadFormData) => {
    const cedulas = parseCedulasFromText(data.cedulas);
    if (cedulas.length === 0) {
      alert('Debe ingresar al menos una cédula válida.');
      return;
    }

    setIsVerifying(true);
    setAuthError(null);

    try {
      const activeSession =
        sessionStatus ?? (await refreshSessionStatus()) ?? (await getScraperSessionStatus());
      if (!activeSession?.connected) {
        setIsVerifying(false);
        setShowAuthAlert(true);
        return;
      }

      setBatchMetadata({
        comment: data.comment || '',
        recognitionType: data.recognitionType
      });

      const manualMembers = membersList.filter((m) => m.unit === 'no_scout');
      const existingByIdentity = new Map<string, ScoutMember>();
      for (const m of membersList) {
        if (m.unit !== 'no_scout') {
          existingByIdentity.set(m.identity, m);
        }
      }

      const deltaCedulas = cedulas.filter((c) => !existingByIdentity.has(c));
      const newlyVerifiedMap = new Map<string, ScoutMember>();
      let sessionError: Error | null = null;

      if (deltaCedulas.length > 0) {
        setVerifyProgress({ current: 0, total: deltaCedulas.length });

        // 1. Probe request on first delta cedula (warms container & fails fast on expired session)
        try {
          const probeMember = await verifySingleCedulaInMemory(deltaCedulas[0]);
          newlyVerifiedMap.set(deltaCedulas[0], probeMember);
          setVerifyProgress((prev) => ({ ...prev, current: prev.current + 1 }));
        } catch (probeErr) {
          if (isScraperSessionError(probeErr)) {
            handleScraperSessionFailure(probeErr);
            return;
          }
          throw probeErr;
        }

        // 2. Remaining delta cedulas via 4-worker concurrency pool with mid-batch circuit breaker
        const remaining = deltaCedulas.slice(1);
        if (remaining.length > 0) {
          let nextIndex = 0;
          let sessionExpired = false;

          const runWorker = async () => {
            while (!sessionExpired) {
              const currentIdx = nextIndex++;
              if (currentIdx >= remaining.length) {
                return;
              }
              const cedula = remaining[currentIdx];
              try {
                const member = await verifySingleCedulaInMemory(cedula);
                newlyVerifiedMap.set(cedula, member);
              } catch (workerErr) {
                if (isScraperSessionError(workerErr)) {
                  sessionExpired = true;
                  if (!sessionError) {
                    sessionError = workerErr;
                  }
                  return;
                }
                throw workerErr;
              } finally {
                setVerifyProgress((prev) => ({ ...prev, current: prev.current + 1 }));
              }
            }
          };

          const workerCount = Math.min(VERIFICATION_POOL_CONCURRENCY, remaining.length);
          await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
        }
      }

      if (sessionError) {
        // Retain all already-verified members so resuming after re-auth skips completed cedulas
        const partialMembers: ScoutMember[] = [];
        for (const cedula of cedulas) {
          const existing = existingByIdentity.get(cedula) ?? newlyVerifiedMap.get(cedula);
          if (existing) {
            partialMembers.push(existing);
          }
        }
        setMembersList([...partialMembers, ...manualMembers]);
        handleScraperSessionFailure(sessionError);
        return;
      }

      const combined: ScoutMember[] = [];
      for (const cedula of cedulas) {
        const member = existingByIdentity.get(cedula) ?? newlyVerifiedMap.get(cedula);
        if (member) {
          combined.push(member);
        }
      }
      combined.push(...manualMembers);

      const withCodes = assignBatchRecognitionCodes(combined, 'auto');
      setMembersList(withCodes);
      setCurrentStep(2);
    } catch (err) {
      console.error('Failed to process Step 1:', err);
      alert('Error al verificar los miembros. Inténtelo de nuevo.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFinalizeBatch = async () => {
    const batchParams = {
      comment: batchMetadata.comment || '',
      region_id: 0,
      district_id: 0,
      group_id: 0,
      unit_scope: 'mixed' as const,
      recognition_type: batchMetadata.recognitionType,
      user_id: user?.uid
    };

    const { batch } = await createBatchWithMembers(batchParams, membersList, user?.uid);
    setBatchId(batch.id);
    void navigate(`/lotes/${batch.id}`);
  };

  const initialCedulas = membersList
    .filter((m) => m.unit !== 'no_scout')
    .map((m) => m.identity)
    .join('\n');

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans relative py-2">
      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          variant="warning"
          onDismiss={() => setShowToast(false)}
        />
      )}

      {/* Header */}
      <div
        data-walkthrough="wizard-header"
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2"
      >
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-neutral tracking-tight flex items-center gap-2">
              Asistente de Creación de Lote
            </h1>
            <WalkthroughHelpButton onClick={() => startTour()} />
          </div>
          <p className="text-xs sm:text-sm text-neutral/75 mt-1">
            Ingresa las cédulas, verifica el registro automáticamente y genera reconocimientos oficiales.
          </p>
        </div>
      </div>

      {/* 2-Step Wizard Navigation Stepper */}
      <WizardStepper currentStep={currentStep} onStepClick={setCurrentStep} />

      {/* STEP 1: LOAD METADATA & CEDULAS */}
      {currentStep === 1 && (
        <Step1DataLoad
          recognitionTypes={recognitionTypes}
          loadingHierarchy={loadingHierarchy}
          isVerifying={isVerifying}
          verifyProgress={verifyProgress}
          onSubmitStep1={onSubmitStep1}
          initialComment={batchMetadata.comment}
          initialRecognitionType={batchMetadata.recognitionType}
          initialCedulas={initialCedulas}
        />
      )}

      {/* STEP 2: REVIEW & CONFIRM */}
      {currentStep === 2 && (
        <Step2ReviewConfirm
          batchId={batchId}
          membersList={membersList}
          onMembersUpdated={setMembersList}
          onBack={() => setCurrentStep(1)}
          onFinalizeBatch={handleFinalizeBatch}
          regions={regions}
          districts={districts}
          groups={groups}
          userId={user?.uid}
        />
      )}

      {/* Scraper Authorization and Error Modals */}
      <ScraperAlertModals
        showAuthAlert={showAuthAlert}
        onCloseAuthAlert={() => setShowAuthAlert(false)}
        authError={authError}
        onCloseAuthError={() => setAuthError(null)}
      />

      {/* Walkthrough Interactive Guide Overlay */}
      <WalkthroughOverlay
        isOpen={isTourOpen}
        currentStep={tourCurrentStep}
        currentStepIndex={currentStepIndex}
        totalSteps={totalSteps}
        targetRect={targetRect}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={skipTour}
        onClose={skipTour}
      />
    </div>
  );
};

export default NewBatchWizard;
