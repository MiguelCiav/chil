import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ClipboardList,
  Users,
  CheckCircle2,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';

import { Card, CardHeader, CardBody } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/Modal';

import {
  getHierarchyData,
  createBatch,
  updateBatch,
  getMemberStatus,
  createMember,
  updateMember,
  deleteMember,
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
  MemberVerificationResult
} from '../types';
import { getAllRecognitionTypes, RecognitionType } from '../../recognitions';

import { Step1Org } from './wizard/Step1Org';
import { Step2Verification } from './wizard/Step2Verification';
import { Step3Review } from './wizard/Step3Review';

// Step 1 Validation Schema
const step1Schema = z.object({
  comment: z.string().optional(),
  regionId: z.string().min(1, "Debe seleccionar una región"),
  districtId: z.string().min(1, "Debe seleccionar un distrito"),
  groupId: z.string().min(1, "Debe seleccionar un grupo scout"),
  recognitionType: z.string().min(1, "Debe seleccionar un tipo de reconocimiento"),
});

type Step1FormData = z.infer<typeof step1Schema>;
function splitFullName(name: string): { first_names: string; last_names: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 4) {
    return {
      first_names: parts.slice(0, 2).join(' '),
      last_names: parts.slice(2).join(' ')
    };
  } else if (parts.length === 3) {
    return {
      first_names: parts[0],
      last_names: parts.slice(1).join(' ')
    };
  } else if (parts.length === 2) {
    return {
      first_names: parts[0],
      last_names: parts[1]
    };
  } else {
    return {
      first_names: name,
      last_names: ''
    };
  }
}

function getStepCircleClasses(currentStep: number, itemStep: number): string {
  if (currentStep === itemStep) {
    return 'bg-primary border-primary text-white shadow-lg ring-4 ring-primary/20 scale-110';
  }
  if (currentStep > itemStep) {
    return 'bg-green-500 border-green-500 text-white shadow-md';
  }
  return 'bg-white border-gray-300 text-gray-400 hover:border-primary/50';
}

function handleScrapeErrorResult(
  err: Error | unknown
): { name: string; status: 'No registrado' | 'Error de red'; isUnregistered: boolean } {
  const errStr = err instanceof Error ? err.message : String(err);
  const isUnregistered = errStr.includes("No registrado");
  return {
    name: isUnregistered ? 'Usuario No Registrado' : 'Error de conexión',
    status: isUnregistered ? 'No registrado' : 'Error de red',
    isUnregistered
  };
}

export const NewBatchWizard: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [batchName, setBatchName] = useState<string>('');

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
      recognitionType: ''
    }
  });

  const selectedRegionId = watch('regionId');
  const selectedDistrictId = watch('districtId');

  // Load Hierarchy & Recognition Data
  useEffect(() => {
    Promise.all([
      getHierarchyData(),
      getAllRecognitionTypes()
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
  }, []);

  // Cascading Drops Logic: Reset dependent dropdowns when parent changes
  useEffect(() => {
    setValue('districtId', '');
    setValue('groupId', '');
  }, [selectedRegionId, setValue]);

  useEffect(() => {
    setValue('groupId', '');
  }, [selectedDistrictId, setValue]);

  // --- Step 1 Submit: Create or Update Batch ---
  const onSubmitStep1 = async (data: Step1FormData) => {
    try {
      let created;
      const params = {
        comment: data.comment || '',
        region_id: Number(data.regionId),
        district_id: Number(data.districtId),
        group_id: Number(data.groupId),
        recognition_type: data.recognitionType
      };

      if (batchId) {
        created = await updateBatch(batchId, params);
      } else {
        created = await createBatch(params);
      }

      setBatchId(created.id);
      setBatchName(created.comment || '');
      setCurrentStep(2);
    } catch (err) {
      console.error("Failed to save batch:", err);
      alert("Error al guardar el lote. Inténtelo de nuevo.");
    }
  };

  // --- Step 2 verification logic ---
  const verifyCedula = async (cedula: string, type: 'young' | 'adult') => {
    // 1. Set to Consultando status
    setVerificationList(prev => {
      const idx = prev.findIndex(item => item.cedula === cedula);
      const newItem: MemberVerificationResult = {
        cedula,
        status: 'Consultando...',
        type
      };
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = newItem;
        return copy;
      } else {
        return [...prev, newItem];
      }
    });

    let scrapedResult: ScraperMemberDetails | null = null;
    let scrapeError: Error | null = null;

    try {
      scrapedResult = await getMemberStatus(cedula);
    } catch (err) {
      scrapeError = err instanceof Error ? err : new Error(String(err));
    }

    if (scrapeError) {
      const { name, status, isUnregistered } = handleScrapeErrorResult(scrapeError);

      setVerificationList(prev => prev.map(item =>
        item.cedula === cedula
          ? {
            cedula,
            name,
            status,
            type
          }
          : item
      ));

      // If unregistered, save as pending in Firestore
      if (isUnregistered && batchId) {
        try {
          await createMember({
            identity: cedula,
            first_names: 'Usuario',
            last_names: 'No Registrado',
            birth_date: '1990-01-01',
            member_type: type,
            status: 'pending',
            batch_id: batchId
          });
        } catch (dbErr) {
          console.error("Database save failed for unregistered member:", dbErr);
        }
      } else if (!isUnregistered) {
        setToastMessage(`Error de red al verificar la cédula ${cedula}`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
      }
    } else if (scrapedResult) {
      const res = scrapedResult;
      const isScrapedActive = res.status?.toLowerCase() === 'activo';
      const rowStatus = isScrapedActive ? 'Registro válido' : 'No registrado';

      // Success! Update list with results
      setVerificationList(prev => prev.map(item =>
        item.cedula === cedula
          ? {
            cedula,
            name: res.nombre_completo,
            status: rowStatus,
            type,
            details: res
          }
          : item
      ));

      // Save to Firestore
      if (batchId) {
        try {
          const { first_names, last_names } = splitFullName(res.nombre_completo);
          await createMember({
            identity: cedula,
            first_names,
            last_names,
            birth_date: res.fecha_nacimiento || '1990-01-01',
            email: res.correo_electronico,
            phone: res.telefono,
            member_type: type,
            status: isScrapedActive ? 'active' : 'pending',
            batch_id: batchId
          });
        } catch (dbErr) {
          console.error("Database save failed for active/inactive member:", dbErr);
        }
      }
    }

    setVerifyProgress(prev => ({ ...prev, current: prev.current + 1 }));
  };

  const handleVerify = async () => {
    const youngs = youngCedulas.split('\n').map(c => c.trim()).filter(c => c !== '');
    const adults = adultCedulas.split('\n').map(c => c.trim()).filter(c => c !== '');
    const allCedulas = [
      ...youngs.map(c => ({ cedula: c, type: 'young' as const })),
      ...adults.map(c => ({ cedula: c, type: 'adult' as const }))
    ];

    if (allCedulas.length === 0) {
      alert("Ingrese al menos una cédula para verificar.");
      return;
    }

    setIsVerifying(true);
    setAuthError(null);

    try {
      // 1. Check if the credentials are saved
      const hasCreds = await hasScraperCredentials();
      if (!hasCreds) {
        setIsVerifying(false);
        setShowAuthAlert(true);
        return;
      }

      // 2. If saved, invoke the scraper login command first to authenticate
      try {
        await loginScraper();
      } catch (loginErr) {
        setIsVerifying(false);
        const errStr = loginErr instanceof Error ? loginErr.message : String(loginErr);
        setAuthError(errStr);
        return;
      }

      // 3. Initiate the parallel verification requests
      setVerifyProgress({ current: 0, total: allCedulas.length });
      const promises = allCedulas.map(item => verifyCedula(item.cedula, item.type));
      await Promise.all(promises);
    } catch (err) {
      console.error("Verification main flow error:", err);
      alert("Hubo un error inesperado al iniciar la verificación.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleToggleMemberType = async (cedula: string) => {
    // 1. Find the current item to determine next type
    const currentItem = verificationList.find(item => item.cedula === cedula);
    if (!currentItem) return;

    const originalType = currentItem.type;
    const nextType = originalType === 'young' ? 'adult' as const : 'young' as const;

    // 2. Optimistic UI update
    setVerificationList(prev => prev.map(item =>
      item.cedula === cedula ? { ...item, type: nextType } : item
    ));

    // 3. Perform database update in background
    if (batchId) {
      try {
        const members = await getMembersByBatchId(batchId);
        const currentMember = members.find(m => m.identity === cedula);
        if (currentMember) {
          currentMember.member_type = nextType;
          await updateMember(currentMember);
        } else {
          throw new Error("Miembro no encontrado en la base de datos.");
        }
      } catch (err) {
        console.error("Error al actualizar tipo de miembro en DB:", err);
        // Revert UI to original state
        setVerificationList(prev => prev.map(item =>
          item.cedula === cedula ? { ...item, type: originalType } : item
        ));
        alert("No se pudo actualizar el tipo de miembro en la base de datos. Se ha revertido el cambio.");
      }
    }
  };

  // Move from Step 2 to Step 3
  const handleStep2Continue = async () => {
    if (batchId) {
      // 1. Get the current active inputs
      const youngs = youngCedulas.split('\n').map(c => c.trim()).filter(c => c !== '');
      const adults = adultCedulas.split('\n').map(c => c.trim()).filter(c => c !== '');
      const currentInputCedulas = new Set([...youngs, ...adults]);

      // 2. Fetch all members currently stored in the DB for this batch
      const dbMembers = await getMembersByBatchId(batchId);

      // 3. Delete any members from DB that are NOT in currentInputCedulas
      const deletePromises = dbMembers
        .filter(m => !currentInputCedulas.has(m.identity))
        .map(m => deleteMember(m.identity));

      await Promise.all(deletePromises);

      // 4. Reload the updated members list
      const members = await getMembersByBatchId(batchId);
      setSavedMembers(members);
      setCurrentStep(3);
    }
  };

  const handleFinalizeBatch = () => {
    // Finalize the batch creation process and head to success screen
    navigate('/lotes/exito', { state: { batchId, name: batchName } });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 font-sans relative">

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-neutral text-white px-5 py-3 rounded-2xl shadow-xl border border-primary/20 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-yellow-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Premium Step Wizard Navigation Bar */}
      <div className="relative">
        {/* Background connector bar */}
        <div className="absolute top-6 left-6 right-6 h-1 bg-gray-200 -translate-y-1/2 rounded-full z-0" />
        <div
          className="absolute top-6 left-6 h-1 bg-primary -translate-y-1/2 rounded-full transition-all duration-500 z-0"
          style={{ width: `calc(${(currentStep - 1) / 2} * (100% - 3rem))` }}
        />

        <div className="relative z-10 flex justify-between">
          {[
            { step: 1, title: 'Organización', desc: 'Metadatos del Lote', icon: <ClipboardList className="w-5 h-5" /> },
            { step: 2, title: 'Miembros', desc: 'Verificación y Carga', icon: <Users className="w-5 h-5" /> },
            { step: 3, title: 'Generación', desc: 'Revisión y Cierre', icon: <CheckCircle2 className="w-5 h-5" /> }
          ].map(item => (
            <button
              type="button"
              key={item.step}
              onClick={() => {
                // Only allow navigating backward to steps already completed
                if (item.step < currentStep) {
                  setCurrentStep(item.step as 1 | 2 | 3);
                }
              }}
              className="flex flex-col items-center group focus:outline-none"
              disabled={item.step >= currentStep}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${getStepCircleClasses(currentStep, item.step)}`}
              >
                {item.icon}
              </div>
              <span className={`mt-2.5 text-sm font-bold transition-colors ${currentStep === item.step ? 'text-primary' : 'text-neutral/70'
                }`}>
                {item.title}
              </span>
              <span className="text-xs text-neutral/40 font-medium hidden sm:inline">{item.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* STEP 1: CONFIGURATION OF METADATA */}
      {currentStep === 1 && (
        <Card className="shadow-lg border-primary/10">
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

              <div className="flex justify-end pt-4 border-t border-primary/10">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!isValid || loadingHierarchy}
                  icon={<ArrowRight size={18} />}
                  iconPosition="right"
                >
                  Siguiente paso
                </Button>
              </div>

            </form>
          </CardBody>
        </Card>
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
        />
      )}

      {/* Scraper Authorization Alert Modal */}
      <Modal isOpen={showAuthAlert} onClose={() => setShowAuthAlert(false)} className="max-w-md">
        <ModalHeader onClose={() => setShowAuthAlert(false)}>
          <span className="flex items-center gap-2 text-amber-600 font-bold">
            <AlertTriangle className="w-5 h-5" />
            Autenticación del Scraper Requerida
          </span>
        </ModalHeader>
        <ModalBody className="space-y-4 text-neutral">
          <p className="text-sm">
            Para realizar la consulta automatizada en el Registro Nacional de Scouts, primero debe configurar su correo y contraseña institucional en los Ajustes del sistema.
          </p>
          <p className="text-xs text-neutral/60 bg-amber-50 border border-amber-100 p-3 rounded-xl font-medium">
            ⚠️ Las credenciales del scraper se guardan localmente de forma segura para las consultas consecutivas del lote.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowAuthAlert(false)}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setShowAuthAlert(false);
              // Trigger settings button click on Navbar
              const settingsBtn = document.querySelector('button[aria-label="Ajustes de Credenciales Scraper"]') as HTMLButtonElement | null;
              if (settingsBtn) {
                settingsBtn.click();
              }
            }}
          >
            Configurar Credenciales
          </Button>
        </ModalFooter>
      </Modal>

      {/* Scraper Connection Auth Error Modal */}
      <Modal isOpen={authError !== null} onClose={() => setAuthError(null)} className="max-w-md">
        <ModalHeader onClose={() => setAuthError(null)}>
          <span className="flex items-center gap-2 text-red-600 font-bold">
            <AlertCircle className="w-5 h-5" />
            Error de Autenticación
          </span>
        </ModalHeader>
        <ModalBody className="space-y-4 text-neutral">
          <p className="text-sm">
            La conexión con el Scraper de la ASV falló debido a credenciales inválidas o expiración de la sesión en el servidor.
          </p>
          <div className="bg-red-50 text-red-800 text-xs border border-red-100 p-3 rounded-xl max-h-32 overflow-y-auto font-mono">
            {authError}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setAuthError(null)}>
            Cerrar
          </Button>
        </ModalFooter>
      </Modal>

    </div>
  );
};
export default NewBatchWizard;
