import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

import {
  getHierarchyData,
  createBatch,
  updateBatch,
  getMemberStatus,
  getMembersByBatchId,
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
  saveScrapedMemberToDb,
  saveUnregisteredMemberToDb
} from './wizard';

export const NewBatchWizard: React.FC = () => {
  const navigate = useNavigate();
  const { refreshSessionStatus } = useScraperSettings();
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

  // Step 1 Submission: Validate, Check Auth, Scrape Impeesa, and Save Initial Batch
  const onSubmitStep1 = async (data: Step1DataLoadFormData) => {
    const cedulas = parseCedulasFromText(data.cedulas);
    if (cedulas.length === 0) {
      alert('Debe ingresar al menos una cédula válida.');
      return;
    }

    setIsVerifying(true);
    setAuthError(null);

    try {
      const sessionStatus = await getScraperSessionStatus();
      if (!sessionStatus.connected) {
        setIsVerifying(false);
        setShowAuthAlert(true);
        return;
      }

      // Create or update batch
      const batchParams = {
        comment: data.comment || '',
        region_id: 0,
        district_id: 0,
        group_id: 0,
        unit_scope: 'mixed' as const,
        recognition_type: data.recognitionType,
        user_id: user?.uid
      };

      let currentBatch;
      if (batchId) {
        currentBatch = await updateBatch(batchId, batchParams, user?.uid);
      } else {
        currentBatch = await createBatch(batchParams, user?.uid);
      }

      setBatchId(currentBatch.id);
      setBatchMetadata({
        comment: data.comment || '',
        recognitionType: data.recognitionType
      });

      // Verification loop
      setVerifyProgress({ current: 0, total: cedulas.length });
      let sessionError: Error | null = null;

      await Promise.all(
        cedulas.map(async (cedula) => {
          try {
            const res = await getMemberStatus(cedula);
            await saveScrapedMemberToDb(cedula, res, undefined, undefined, currentBatch.id, user?.uid);
          } catch (scrapeErr) {
            if (isScraperSessionError(scrapeErr)) {
              sessionError = scrapeErr;
              return;
            }
            const errStr = scrapeErr instanceof Error ? scrapeErr.message : String(scrapeErr);
            if (errStr.includes('No registrado')) {
              await saveUnregisteredMemberToDb(cedula, 'young', 'tropa', currentBatch.id, user?.uid);
            } else {
              await saveUnregisteredMemberToDb(cedula, 'young', 'tropa', currentBatch.id, user?.uid);
              setToastMessage(`Error de red al verificar la cédula ${cedula}`);
              setShowToast(true);
              setTimeout(() => setShowToast(false), 4000);
            }
          } finally {
            setVerifyProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }
        })
      );

      if (sessionError) {
        await refreshSessionStatus().catch(() => {});
        const sessionErrObj = sessionError as Error;
        if (
          isScraperSessionError(sessionErrObj) &&
          sessionErrObj.reason === 'SCRAPER_NOT_CONFIGURED'
        ) {
          setShowAuthAlert(true);
        } else {
          setAuthError(sessionErrObj.message);
        }
        return;
      }

      // Load all saved members from DB and assign recognition codes
      const saved = await getMembersByBatchId(currentBatch.id);
      const withCodes = assignBatchRecognitionCodes(saved, 'auto');
      setMembersList(withCodes);
      setCurrentStep(2);
    } catch (err) {
      console.error('Failed to process Step 1:', err);
      alert('Error al verificar los miembros. Inténtelo de nuevo.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFinalizeBatch = () => {
    navigate('/lotes/exito', {
      state: { batchId, name: batchMetadata.comment }
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans relative py-2">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-neutral text-white px-5 py-3 rounded-2xl shadow-xl border border-primary/20 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-yellow-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
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
          <p className="text-xs sm:text-sm text-neutral/70 mt-1">
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
          initialCedulas={membersList.map((m) => m.identity).join('\n')}
        />
      )}

      {/* STEP 2: REVIEW & CONFIRM */}
      {currentStep === 2 && batchId !== null && (
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
