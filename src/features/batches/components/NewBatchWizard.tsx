import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, AlertCircle } from 'lucide-react';

import { Card, CardHeader, CardBody } from '../../../components/Card';
import { Button } from '../../../components/Button';

import {
  getHierarchyData,
  createBatch,
  updateBatch,
  getMemberStatus,
  updateMember,
  getMembersByBatchId,
  hasScraperCredentials,
  loginScraper,
  ScraperMemberDetails
} from '../api';
import {
  Region,
  District,
  ScoutGroup,
  ScoutMember,
  MemberVerificationResult,
  BatchUnitScope,
  ScoutUnit
} from '../types';
import { getAllRecognitionTypes, RecognitionType } from '../../recognitions';
import { useAuth } from '../../auth';
import {
  useWalkthrough,
  WalkthroughOverlay,
  WalkthroughHelpButton
} from '../../../components/walkthrough';

import {
  Step1Org,
  Step2Verification,
  Step3Review,
  WizardStepper,
  ScraperAlertModals,
  NEW_BATCH_WIZARD_TOUR_STEPS,
  step1Schema,
  Step1FormData,
  getInitialMemberUnit,
  upsertVerificationItem,
  handleScrapeErrorResult,
  parseCedulaEntries,
  InitialMemberHierarchy,
  saveNoScoutMemberToDb,
  saveUnregisteredMemberToDb,
  saveScrapedMemberToDb,
  syncAndFinalizeStep2Members
} from './wizard';

export const NewBatchWizard: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [batchName, setBatchName] = useState<string>('');
  const [batchRegionId, setBatchRegionId] = useState<number>(0);
  const [batchDistrictId, setBatchDistrictId] = useState<number>(0);
  const [batchGroupId, setBatchGroupId] = useState<number>(0);
  const [batchUnitScope, setBatchUnitScope] = useState<BatchUnitScope>('mixed');

  // Hierarchy State
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [groups, setGroups] = useState<ScoutGroup[]>([]);
  const [recognitionTypes, setRecognitionTypes] = useState<RecognitionType[]>([]);
  const [loadingHierarchy, setLoadingHierarchy] = useState(true);

  // Step 2 State
  const [youngCedulas, setYoungCedulas] = useState('');
  const [adultCedulas, setAdultCedulas] = useState('');
  const [verificationList, setVerificationList] = useState<MemberVerificationResult[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyProgress, setVerifyProgress] = useState({ current: 0, total: 0 });
  const [showAuthAlert, setShowAuthAlert] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Step 3 State
  const [savedMembers, setSavedMembers] = useState<ScoutMember[]>([]);

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

  // --- Initialize Form (Step 1) ---
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    mode: 'onChange',
    defaultValues: {
      comment: '',
      regionId: '',
      districtId: '',
      groupId: '',
      recognitionType: '',
      unitScope: 'mixed'
    }
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

  // --- Step 1 Submit: Create or Update Batch ---
  const onSubmitStep1 = async (data: Step1FormData) => {
    try {
      let created;
      const unit_scope: BatchUnitScope = (data.unitScope as BatchUnitScope) || 'mixed';
      setBatchUnitScope(unit_scope);

      const region_id = data.regionId ? Number(data.regionId) : 0;
      const district_id = data.districtId ? Number(data.districtId) : 0;
      const group_id = data.groupId ? Number(data.groupId) : 0;

      const params = {
        comment: data.comment || '',
        region_id,
        district_id,
        group_id,
        unit_scope,
        recognition_type: data.recognitionType,
        user_id: user?.uid
      };

      if (batchId) {
        created = await updateBatch(batchId, params, user?.uid);
      } else {
        created = await createBatch(params, user?.uid);
      }

      setBatchId(created.id);
      setBatchName(created.comment || '');
      setBatchRegionId(region_id);
      setBatchDistrictId(district_id);
      setBatchGroupId(group_id);
      setCurrentStep(2);
    } catch (err) {
      console.error('Failed to save batch:', err);
      alert('Error al guardar el lote. Inténtelo de nuevo.');
    }
  };

  // --- Step 2 verification logic ---
  const verifyCedula = async (cedula: string, type: 'young' | 'adult', explicitUnit?: ScoutUnit) => {
    const memberUnit = getInitialMemberUnit(explicitUnit, batchUnitScope, type);
    const initialHierarchy: InitialMemberHierarchy = {
      region_id: batchRegionId !== 0 ? batchRegionId : undefined,
      district_id: batchDistrictId !== 0 ? batchDistrictId : undefined,
      group_id: batchGroupId !== 0 ? batchGroupId : undefined
    };

    // If member is 'no_scout', completely bypass Sistema de Registro scraper query and mark as active
    if (memberUnit === 'no_scout') {
      setVerificationList((prev) =>
        upsertVerificationItem(prev, {
          cedula,
          name: 'Colaborador No Scout',
          status: 'Registro válido',
          type,
          unit: 'no_scout',
          region_id: initialHierarchy.region_id,
          district_id: initialHierarchy.district_id,
          group_id: initialHierarchy.group_id
        })
      );

      await saveNoScoutMemberToDb(cedula, type, batchId, user?.uid, initialHierarchy);
      setVerifyProgress((prev) => ({ ...prev, current: prev.current + 1 }));
      return;
    }

    // 1. Set to Consultando status
    setVerificationList((prev) =>
      upsertVerificationItem(prev, {
        cedula,
        status: 'Consultando...',
        type,
        unit: memberUnit,
        region_id: initialHierarchy.region_id,
        district_id: initialHierarchy.district_id,
        group_id: initialHierarchy.group_id
      })
    );

    let scrapedResult: ScraperMemberDetails | null = null;
    let scrapeError: Error | null = null;

    try {
      scrapedResult = await getMemberStatus(cedula);
    } catch (err) {
      scrapeError = err instanceof Error ? err : new Error(String(err));
    }

    if (scrapeError) {
      const { name, status, isUnregistered } = handleScrapeErrorResult(scrapeError);

      setVerificationList((prev) =>
        prev.map((item) =>
          item.cedula === cedula
            ? {
                cedula,
                name,
                status,
                type,
                unit: memberUnit,
                region_id: item.region_id ?? initialHierarchy.region_id,
                district_id: item.district_id ?? initialHierarchy.district_id,
                group_id: item.group_id ?? initialHierarchy.group_id
              }
            : item
        )
      );

      if (isUnregistered) {
        await saveUnregisteredMemberToDb(cedula, type, memberUnit, batchId, user?.uid, initialHierarchy);
      } else {
        setToastMessage(`Error de red al verificar la cédula ${cedula}`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
      }
    } else if (scrapedResult) {
      const res = scrapedResult;
      const isScrapedActive = res.status?.toLowerCase() === 'activo';
      const rowStatus = isScrapedActive ? 'Registro válido' : 'No registrado';

      setVerificationList((prev) =>
        prev.map((item) =>
          item.cedula === cedula
            ? {
                cedula,
                name: res.nombre_completo,
                status: rowStatus,
                type,
                unit: memberUnit,
                details: res,
                region_id: item.region_id ?? initialHierarchy.region_id,
                district_id: item.district_id ?? initialHierarchy.district_id,
                group_id: item.group_id ?? initialHierarchy.group_id
              }
            : item
        )
      );

      await saveScrapedMemberToDb(cedula, res, type, memberUnit, batchId, user?.uid, initialHierarchy);
    }

    setVerifyProgress((prev) => ({ ...prev, current: prev.current + 1 }));
  };

  const handleVerify = async () => {
    const { allCedulas } = parseCedulaEntries(youngCedulas, adultCedulas);

    if (allCedulas.length === 0) {
      alert('Ingrese al menos una cédula para verificar.');
      return;
    }

    setIsVerifying(true);
    setAuthError(null);

    try {
      const isAllNoScout = batchUnitScope === 'no_scout';

      if (!isAllNoScout) {
        const hasCreds = await hasScraperCredentials();
        if (!hasCreds) {
          setIsVerifying(false);
          setShowAuthAlert(true);
          return;
        }

        try {
          await loginScraper();
        } catch (loginErr) {
          setIsVerifying(false);
          const errStr = loginErr instanceof Error ? loginErr.message : String(loginErr);
          setAuthError(errStr);
          return;
        }
      }

      setVerifyProgress({ current: 0, total: allCedulas.length });
      const promises = allCedulas.map((item) => verifyCedula(item.cedula, item.type));
      await Promise.all(promises);
    } catch (err) {
      console.error('Verification main flow error:', err);
      alert('Hubo un error inesperado al iniciar la verificación.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleToggleMemberType = async (cedula: string) => {
    const currentItem = verificationList.find((item) => item.cedula === cedula);
    if (!currentItem) return;

    const originalType = currentItem.type;
    const nextType = originalType === 'young' ? ('adult' as const) : ('young' as const);

    setVerificationList((prev) =>
      prev.map((item) => (item.cedula === cedula ? { ...item, type: nextType } : item))
    );

    if (batchId) {
      try {
        const members = await getMembersByBatchId(batchId);
        const currentMember = members.find((m) => m.identity === cedula);
        if (currentMember) {
          currentMember.member_type = nextType;
          await updateMember(currentMember);
        } else {
          throw new Error('Miembro no encontrado en la base de datos.');
        }
      } catch (err) {
        console.error('Error al actualizar tipo de miembro en DB:', err);
        setVerificationList((prev) =>
          prev.map((item) => (item.cedula === cedula ? { ...item, type: originalType } : item))
        );
        alert('No se pudo actualizar el tipo de miembro en la base de datos. Se ha revertido el cambio.');
      }
    }
  };

  const handleUpdateMemberHierarchy = async (
    cedula: string,
    hierarchy: { region_id?: number; district_id?: number; group_id?: number }
  ) => {
    const currentItem = verificationList.find((item) => item.cedula === cedula);
    if (!currentItem) return;

    const originalRegionId = currentItem.region_id;
    const originalDistrictId = currentItem.district_id;
    const originalGroupId = currentItem.group_id;

    const targetRegionId = hierarchy.region_id === 0 ? undefined : hierarchy.region_id;
    const targetDistrictId = hierarchy.district_id === 0 ? undefined : hierarchy.district_id;
    const targetGroupId = hierarchy.group_id === 0 ? undefined : hierarchy.group_id;

    setVerificationList((prev) =>
      prev.map((item) =>
        item.cedula === cedula
          ? {
              ...item,
              region_id: targetRegionId,
              district_id: targetDistrictId,
              group_id: targetGroupId
            }
          : item
      )
    );

    if (batchId) {
      try {
        const members = await getMembersByBatchId(batchId);
        const currentMember = members.find((m) => m.identity === cedula);
        if (currentMember) {
          currentMember.region_id = targetRegionId;
          currentMember.district_id = targetDistrictId;
          currentMember.group_id = targetGroupId;
          await updateMember(currentMember);
        }
      } catch (err) {
        console.error('Error al actualizar jerarquía de miembro en DB:', err);
        setVerificationList((prev) =>
          prev.map((item) =>
            item.cedula === cedula
              ? {
                  ...item,
                  region_id: originalRegionId,
                  district_id: originalDistrictId,
                  group_id: originalGroupId
                }
              : item
          )
        );
        alert('No se pudo actualizar la estructura scout del miembro en la base de datos.');
      }
    }
  };

  const handleUpdateMemberGroup = (cedula: string, newGroupId: number) => {
    const currentItem = verificationList.find((item) => item.cedula === cedula);
    handleUpdateMemberHierarchy(cedula, {
      region_id: currentItem?.region_id,
      district_id: currentItem?.district_id,
      group_id: newGroupId
    });
  };

  // Move from Step 2 to Step 3
  const handleStep2Continue = async () => {
    if (batchId) {
      const membersWithCodes = await syncAndFinalizeStep2Members(
        batchId,
        youngCedulas,
        adultCedulas,
        batchUnitScope
      );
      setSavedMembers(membersWithCodes);
      setCurrentStep(3);
    }
  };

  const handleFinalizeBatch = () => {
    navigate('/lotes/exito', { state: { batchId, name: batchName } });
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
            Configura la estructura geográfica, verifica miembros y genera reconocimientos masivos.
          </p>
        </div>
      </div>

      {/* Premium Step Wizard Navigation Bar */}
      <WizardStepper currentStep={currentStep} onStepClick={setCurrentStep} />

      {/* STEP 1: CONFIGURATION OF METADATA */}
      {currentStep === 1 && (
        <div data-walkthrough="wizard-step-container" className="space-y-4">
          <Card className="border-primary/10">
            <CardHeader className="bg-primary/5 border-b border-primary/10 flex items-center gap-3">
              Configuración del Lote
            </CardHeader>
            <CardBody>
              <form onSubmit={handleSubmit(onSubmitStep1)} className="space-y-6">
                <Step1Org
                  register={register}
                  setValue={setValue}
                  watch={watch}
                  errors={errors}
                  regions={regions}
                  districts={districts}
                  groups={groups}
                  loadingHierarchy={loadingHierarchy}
                  recognitionTypes={recognitionTypes}
                />

                <div
                  data-walkthrough="wizard-navigation-buttons"
                  className="flex justify-end pt-4 border-t border-primary/10"
                >
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!isValid || loadingHierarchy || recognitionTypes.length === 0}
                    icon={<ArrowRight size={18} />}
                    iconPosition="right"
                  >
                    Siguiente paso
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}

      {/* STEP 2: LOAD & VERIFY MEMBERS */}
      {currentStep === 2 && (
        <Step2Verification
          batchName={batchName}
          youngCedulas={youngCedulas}
          setYoungCedulas={setYoungCedulas}
          adultCedulas={adultCedulas}
          setAdultCedulas={setAdultCedulas}
          isVerifying={isVerifying}
          verifyProgress={verifyProgress}
          verificationList={verificationList}
          handleVerify={handleVerify}
          verifyCedula={verifyCedula}
          handleToggleMemberType={handleToggleMemberType}
          handleStep2Continue={handleStep2Continue}
          onBack={() => setCurrentStep(1)}
          regions={regions}
          districts={districts}
          groups={groups}
          onUpdateMemberGroup={handleUpdateMemberGroup}
          onUpdateMemberHierarchy={handleUpdateMemberHierarchy}
        />
      )}

      {/* STEP 3: REVIEW & CONFIRM */}
      {currentStep === 3 && (
        <Step3Review
          batchId={batchId!}
          savedMembers={savedMembers}
          onMembersUpdated={setSavedMembers}
          handleFinalizeBatch={handleFinalizeBatch}
          onBack={() => setCurrentStep(2)}
          regions={regions}
          districts={districts}
          groups={groups}
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
