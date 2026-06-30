import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ClipboardList, Users, CheckCircle, Sparkles, ChevronDown } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Step1Org } from './wizard/Step1Org';
import { Step2Verification } from './wizard/Step2Verification';
import { Step3Review } from './wizard/Step3Review';
import { Region, District, ScoutGroup, ScoutMember } from '../types';
import { getHierarchyData, createBatch, updateBatch } from '../api';

// Step 1 Validation Schema
const step1Schema = z.object({
  comment: z.string().optional(),
  regionId: z.string().min(1, "Debe seleccionar una región"),
  districtId: z.string().min(1, "Debe seleccionar un distrito"),
  groupId: z.string().min(1, "Debe seleccionar un grupo scout"),
  recognitionType: z.string().min(1, "Debe seleccionar un tipo de reconocimiento"),
});

type Step1FormData = z.infer<typeof step1Schema>;

export const NewBatchWizard: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [batchName, setBatchName] = useState<string>('');

  // Hierarchy Data States
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [groups, setGroups] = useState<ScoutGroup[]>([]);
  const [loadingHierarchy, setLoadingHierarchy] = useState(true);

  // Step 3 members list
  const [savedMembers, setSavedMembers] = useState<ScoutMember[]>([]);

  // React Hook Form for Step 1
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
  const selectedGroupId = watch('groupId');

  // Load Hierarchy Data
  useEffect(() => {
    getHierarchyData()
      .then(data => {
        setRegions(data.regions);
        setDistricts(data.districts);
        setGroups(data.groups);
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

  const stepItems = [
    { step: 1, title: "Organización", desc: "Metadatos del Lote", icon: <ClipboardList className="w-5 h-5" /> },
    { step: 2, title: "Miembros", desc: "Verificación y Carga", icon: <Users className="w-5 h-5" /> },
    { step: 3, title: "Confirmación", desc: "Generación de Documentos", icon: <CheckCircle className="w-5 h-5" /> }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 font-sans relative">
      
      {/* Wizard Header Progress Bar */}
      <div className="bg-white border border-primary/20 rounded-3xl p-6 shadow-sm">
        <div className="relative flex items-center justify-between">
          <div className="absolute top-6 left-6 right-6 h-1 bg-gray-200 -translate-y-1/2 rounded-full z-0" />
          <div 
            className="absolute top-6 left-6 h-1 bg-primary -translate-y-1/2 rounded-full transition-all duration-500 z-0"
            style={{ width: `calc(${(currentStep - 1) / 2} * (100% - 3rem))` }}
          />
          {stepItems.map((item) => (
            <button
              key={item.step}
              onClick={() => {
                // Only allow switching steps back or if we already have batchId
                if (batchId && item.step < currentStep) {
                  setCurrentStep(item.step as 1 | 2 | 3);
                }
              }}
              className="flex flex-col items-center group focus:outline-none"
              disabled={!batchId || item.step > currentStep}
            >
              <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  currentStep === item.step
                    ? 'bg-primary border-primary text-white shadow-lg ring-4 ring-primary/20 scale-110'
                    : currentStep > item.step
                      ? 'bg-green-500 border-green-500 text-white shadow-md'
                      : 'bg-white border-gray-300 text-gray-400 hover:border-primary/50'
                }`}
              >
                {item.icon}
              </div>
              <span className={`mt-2.5 text-sm font-bold transition-colors ${
                currentStep === item.step ? 'text-primary' : 'text-neutral/70'
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
            <Sparkles className="text-primary w-6 h-6 animate-pulse" />
            Configuración del Lote
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit(onSubmitStep1)} className="space-y-6">
              <Step1Org
                register={register}
                setValue={setValue}
                errors={errors}
                loadingHierarchy={loadingHierarchy}
                regions={regions}
                districts={districts}
                groups={groups}
                selectedRegionId={selectedRegionId}
                selectedDistrictId={selectedDistrictId}
                selectedGroupId={selectedGroupId}
              />
              <div className="flex justify-end pt-4 border-t border-gray-150">
                <Button 
                  type="submit" 
                  variant="primary" 
                  disabled={!isValid || loadingHierarchy}
                  icon={<ChevronDown className="w-4 h-4 rotate-270" />} 
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
      {currentStep === 2 && batchId !== null && (
        <Step2Verification
          batchId={batchId}
          batchName={batchName}
          onNext={(members) => {
            setSavedMembers(members);
            setCurrentStep(3);
          }}
          onBack={() => setCurrentStep(1)}
        />
      )}

      {/* STEP 3: REVIEW & CONFIRM */}
      {currentStep === 3 && batchId !== null && (
        <Step3Review
          batchId={batchId}
          savedMembers={savedMembers}
          setSavedMembers={setSavedMembers}
          onBack={() => setCurrentStep(2)}
          onFinalize={() => navigate('/lotes/exito', { state: { batchId, name: batchName } })}
        />
      )}

    </div>
  );
};

export default NewBatchWizard;
