import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  ArrowLeft, 
  Search, 
  Edit2, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  Users, 
  GraduationCap, 
  User, 
  Sparkles,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  ChevronDown
} from 'lucide-react';

import { Card, CardHeader, CardBody, CardFooter } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Field } from '../../../components/Field';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/Modal';
import { Table } from '../../../components/Table';
import { ColumnDef } from '@tanstack/react-table';

import { 
  getHierarchyData, 
  createBatch, 
  updateBatch,
  getMemberStatus, 
  createMember, 
  updateMember, 
  getMembersByBatchId,
  RECOGNITION_TYPES,
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

  // Hierarchy State
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [groups, setGroups] = useState<ScoutGroup[]>([]);
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
  const [activeTab, setActiveTab] = useState<'valid' | 'pending'>('valid');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMember, setEditingMember] = useState<ScoutMember | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Selector Modal States
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [isDistrictModalOpen, setIsDistrictModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  // Selector Search Query States
  const [regionSearch, setRegionSearch] = useState('');
  const [districtSearch, setDistrictSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');

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

  const filteredDistricts = districts.filter(
    d => d.region_id === Number(selectedRegionId)
  );

  const filteredGroups = groups.filter(
    g => g.district_id === Number(selectedDistrictId)
  );

  const selectedRegion = regions.find(r => r.id.toString() === selectedRegionId);
  const selectedDistrict = districts.find(d => d.id.toString() === selectedDistrictId);
  const selectedGroup = groups.find(g => g.id.toString() === selectedGroupId);

  const filteredRegionsList = regions.filter(r =>
    r.name.toLowerCase().includes(regionSearch.toLowerCase())
  );

  const filteredDistrictsList = filteredDistricts.filter(d =>
    d.name.toLowerCase().includes(districtSearch.toLowerCase())
  );

  const filteredGroupsList = filteredGroups.filter(g =>
    g.name.toLowerCase().includes(groupSearch.toLowerCase())
  );

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
      const errStr = scrapeError.message;
      const isUnregistered = errStr.includes("No registrado");
      const status = isUnregistered ? 'No registrado' : 'Error de red';

      setVerificationList(prev => prev.map(item => 
        item.cedula === cedula 
          ? { 
              cedula, 
              name: isUnregistered ? 'Usuario No Registrado' : 'Error de conexión', 
              status, 
              type 
            } 
          : item
      ));

      // If unregistered, save as pending in SQLite
      if (isUnregistered && batchId) {
        try {
          await createMember({
            identity: cedula,
            first_name: 'Usuario',
            last_name: 'No Registrado',
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
      const isScrapedActive = res.status && res.status.toLowerCase() === 'activo';
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

      // Save to SQLite
      if (batchId) {
        try {
          await createMember({
            identity: cedula,
            first_name: res.nombre_completo.split(' ')[0] || 'Miembro',
            last_name: res.nombre_completo.split(' ').slice(1).join(' ') || 'Scrapeado',
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

      // 2. If saved, invoke the Tauri login command first to authenticate
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
      const members = await getMembersByBatchId(batchId);
      setSavedMembers(members);
      setCurrentStep(3);
    }
  };

  // --- Step 3 Actions ---
  const handleEditMemberClick = (member: ScoutMember) => {
    setEditingMember(member);
    setIsEditModalOpen(true);
  };

  const handleSaveEditedMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingMember || !batchId) return;

    try {
      await updateMember(editingMember);
      // Reload lists
      const members = await getMembersByBatchId(batchId);
      setSavedMembers(members);
      setIsEditModalOpen(false);
      setEditingMember(null);
    } catch (err) {
      console.error(err);
      alert("Error al actualizar la información del miembro.");
    }
  };

  const handleFinalizeBatch = () => {
    // Finalize the batch creation process and head to success screen
    navigate('/lotes/exito', { state: { batchId, name: batchName } });
  };

  // --- TanStack Table Column Definitions (Step 2) ---
  const columns: ColumnDef<MemberVerificationResult>[] = [
    {
      accessorKey: 'cedula',
      header: 'Cédula',
      cell: (info) => (
        <span className="font-semibold text-neutral">{info.getValue() as string}</span>
      )
    },
    {
      accessorKey: 'name',
      header: 'Nombre Completo',
      cell: (info) => (
        <span className="text-neutral/80">{info.getValue() as string || 'Pendiente...'}</span>
      )
    },
    {
      accessorKey: 'status',
      header: 'Estatus',
      cell: (info) => {
        const val = info.getValue() as string;
        if (val === 'Consultando...') {
          return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 animate-pulse border border-blue-200">
              <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />
              Consultando...
            </span>
          );
        } else if (val === 'Registro válido') {
          return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
              <Check className="w-3.5 h-3.5 mr-1" />
              Registro válido
            </span>
          );
        } else if (val === 'No registrado') {
          return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
              No registrado
            </span>
          );
        } else {
          const rowData = info.row.original;
          return (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                Error de red
              </span>
              <button 
                onClick={() => verifyCedula(rowData.cedula, rowData.type)}
                className="p-1 hover:bg-primary/10 rounded text-primary transition-colors"
                title="Reintentar verificación"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        }
      }
    },
    {
      accessorKey: 'type',
      header: 'Tipo de Miembro',
      cell: (info) => {
        const val = info.getValue() as 'young' | 'adult';
        const rowData = info.row.original;
        return (
          <div className="flex items-center">
            <button
              onClick={() => handleToggleMemberType(rowData.cedula)}
              className={`px-3 py-1 rounded-l-md text-xs font-semibold border border-r-0 transition-colors ${
                val === 'young' 
                  ? 'bg-primary text-white border-primary' 
                  : 'bg-white hover:bg-gray-50 border-gray-300 text-neutral'
              }`}
            >
              Joven
            </button>
            <button
              onClick={() => handleToggleMemberType(rowData.cedula)}
              className={`px-3 py-1 rounded-r-md text-xs font-semibold border transition-colors ${
                val === 'adult' 
                  ? 'bg-primary text-white border-primary' 
                  : 'bg-white hover:bg-gray-50 border-gray-300 text-neutral'
              }`}
            >
              Adulto
            </button>
          </div>
        );
      }
    }
  ];

  // --- Step 3 Filtering ---
  const validMembers = savedMembers.filter(m => m.status === 'active');
  const pendingMembers = savedMembers.filter(m => m.status === 'pending');

  const filteredStep3Members = (activeTab === 'valid' ? validMembers : pendingMembers).filter(m => {
    const term = searchQuery.toLowerCase();
    const fullName = `${m.first_name} ${m.last_name}`.toLowerCase();
    return fullName.includes(term) || m.identity.includes(term);
  });

  const totals = {
    total: savedMembers.length,
    young: savedMembers.filter(m => m.member_type === 'young').length,
    adult: savedMembers.filter(m => m.member_type === 'adult').length,
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
            { step: 3, title: 'Revisión', desc: 'Ajustes y Cierre', icon: <CheckCircle2 className="w-5 h-5" /> }
          ].map((item) => (
            <button
              key={item.step}
              disabled={item.step > (batchId ? 3 : 1)}
              onClick={() => setCurrentStep(item.step as 1 | 2 | 3)}
              className="flex flex-col items-center group focus:outline-none"
            >
              <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  currentStep === item.step
                    ? 'bg-primary border-primary text-white shadow-lg ring-4 ring-primary/20 scale-110'
                    : currentStep > item.step
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'bg-white border-gray-300 text-gray-400 hover:border-primary/50'
                }`}
              >
                {item.icon}
              </div>
              <span className={`mt-2.5 text-sm font-bold transition-colors ${currentStep === item.step ? 'text-primary' : 'text-neutral/70'}`}>
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
              
              <div className="grid md:grid-cols-2 gap-6">
                
                <div className="space-y-6">
                  {/* Hidden inputs for RHF validation */}
                  <input type="hidden" {...register('regionId')} />
                  <input type="hidden" {...register('districtId')} />
                  <input type="hidden" {...register('groupId')} />

                  {/* Region Selector */}
                  <div className="w-full">
                    <label htmlFor="region-selector" className="block uppercase text-sm font-semibold mb-2 tracking-wide text-neutral">
                      Región Scout *
                    </label>
                    <button
                      type="button"
                      id="region-selector"
                      onClick={() => {
                        setRegionSearch('');
                        setIsRegionModalOpen(true);
                      }}
                      className={`w-full rounded-field px-4 text-left transition-all bg-primary/5 border text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary h-[46px] ${
                        errors.regionId 
                          ? 'border-red-300 ring-2 ring-red-500 bg-red-50 text-red-900' 
                          : 'border-primary/20 text-neutral hover:border-primary/50'
                      }`}
                      disabled={loadingHierarchy}
                    >
                      <span className="truncate">{selectedRegion ? selectedRegion.name : 'Seleccione una región'}</span>
                      <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${loadingHierarchy ? 'text-neutral/20' : 'text-primary/70'}`} />
                    </button>
                    {errors.regionId && (
                      <p className="mt-1.5 text-sm text-red-500 font-medium">{errors.regionId.message}</p>
                    )}
                  </div>

                  {/* District Selector */}
                  <div className="w-full">
                    <label htmlFor="district-selector" className="block uppercase text-sm font-semibold mb-2 tracking-wide text-neutral">
                      Distrito Scout *
                    </label>
                    <button
                      type="button"
                      id="district-selector"
                      onClick={() => {
                        if (selectedRegionId) {
                          setDistrictSearch('');
                          setIsDistrictModalOpen(true);
                        }
                      }}
                      className={`w-full rounded-field px-4 text-left transition-all bg-primary/5 border text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary h-[46px] ${
                        !selectedRegionId || loadingHierarchy
                          ? 'bg-gray-100 text-neutral/30 border-gray-200 cursor-not-allowed opacity-50'
                          : errors.districtId
                            ? 'border-red-300 ring-2 ring-red-500 bg-red-50 text-red-900'
                            : 'border-primary/20 text-neutral hover:border-primary/50'
                      }`}
                      disabled={!selectedRegionId || loadingHierarchy}
                    >
                      <span className="truncate">{selectedDistrict ? selectedDistrict.name : 'Seleccione un distrito'}</span>
                      <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${!selectedRegionId || loadingHierarchy ? 'text-neutral/20' : 'text-primary/70'}`} />
                    </button>
                    {errors.districtId && (
                      <p className="mt-1.5 text-sm text-red-500 font-medium">{errors.districtId.message}</p>
                    )}
                  </div>

                  {/* Group Selector */}
                  <div className="w-full">
                    <label htmlFor="group-selector" className="block uppercase text-sm font-semibold mb-2 tracking-wide text-neutral">
                      Grupo Scout *
                    </label>
                    <button
                      type="button"
                      id="group-selector"
                      onClick={() => {
                        if (selectedDistrictId) {
                          setGroupSearch('');
                          setIsGroupModalOpen(true);
                        }
                      }}
                      className={`w-full rounded-field px-4 text-left transition-all bg-primary/5 border text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary h-[46px] ${
                        !selectedDistrictId || loadingHierarchy
                          ? 'bg-gray-100 text-neutral/30 border-gray-200 cursor-not-allowed opacity-50'
                          : errors.groupId
                            ? 'border-red-300 ring-2 ring-red-500 bg-red-50 text-red-900'
                            : 'border-primary/20 text-neutral hover:border-primary/50'
                      }`}
                      disabled={!selectedDistrictId || loadingHierarchy}
                    >
                      <span className="truncate">{selectedGroup ? selectedGroup.name : 'Seleccione un grupo scout'}</span>
                      <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${!selectedDistrictId || loadingHierarchy ? 'text-neutral/20' : 'text-primary/70'}`} />
                    </button>
                    {errors.groupId && (
                      <p className="mt-1.5 text-sm text-red-500 font-medium">{errors.groupId.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <Field
                    label="Comentario (Opcional)"
                    placeholder="Ej. Lote Aniversario Mayo 2026"
                    disabled={loadingHierarchy}
                    {...register('comment')}
                  />

                  {/* Recognition Type Select */}
                  <div className="w-full">
                    <label htmlFor="recognition-select" className="block uppercase text-sm font-semibold mb-2 tracking-wide text-neutral">
                      Tipo de Reconocimiento *
                    </label>
                    <select
                      id="recognition-select"
                      className={`w-full rounded-field px-4 transition-all bg-primary/5 border text-neutral focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:text-neutral/30 disabled:border-gray-200 disabled:cursor-not-allowed text-sm h-[46px] ${
                        errors.recognitionType ? 'border-red-300 ring-2 ring-red-500 bg-red-50' : 'border-primary/20'
                      }`}
                      disabled={loadingHierarchy}
                      {...register('recognitionType')}
                    >
                      <option value="">Seleccione un reconocimiento</option>
                      {RECOGNITION_TYPES.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    {errors.recognitionType && (
                      <p className="mt-1.5 text-sm text-red-500 font-medium">{errors.recognitionType.message}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
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
        <Card className="shadow-lg border-primary/10">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <div>
              <div className="text-lg font-bold text-neutral">Verificación de Cédulas</div>
              <p className="text-sm text-neutral/50 font-normal">Lote: {batchName}</p>
            </div>
          </CardHeader>
          <CardBody className="space-y-8">
            <div className="grid md:grid-cols-2 gap-6">
              <Field
                label="Cédulas de Jóvenes (Una por línea)"
                placeholder="Ej.&#10;29111222&#10;30444555"
                multiline
                rows={6}
                value={youngCedulas}
                onChange={e => setYoungCedulas(e.target.value)}
                disabled={isVerifying}
              />
              <Field
                label="Cédulas de Adultos (Una por línea)"
                placeholder="Ej.&#10;12333444&#10;15666777"
                multiline
                rows={6}
                value={adultCedulas}
                onChange={e => setAdultCedulas(e.target.value)}
                disabled={isVerifying}
              />
            </div>

            <div className="flex justify-center pt-2">
              <Button
                variant="primary"
                onClick={handleVerify}
                disabled={isVerifying || (!youngCedulas && !adultCedulas)}
                icon={<RefreshCw className={`w-4 h-4 ${isVerifying ? 'animate-spin' : ''}`} />}
              >
                {isVerifying ? `Verificando (${verifyProgress.current}/${verifyProgress.total})...` : 'Iniciar Verificación'}
              </Button>
            </div>

            {verificationList.length > 0 && (
              <div className="space-y-4">
                <div className="text-md font-bold text-neutral">Resultados de la Verificación</div>
                <Table columns={columns} data={verificationList} />
              </div>
            )}
          </CardBody>
          <CardFooter>
            <Button
              variant="outline"
              onClick={() => setCurrentStep(1)}
              icon={<ArrowLeft size={18} />}
            >
              Atrás
            </Button>
            <Button
              variant="primary"
              onClick={handleStep2Continue}
              disabled={verificationList.length === 0 || isVerifying}
              icon={<ArrowRight size={18} />}
              iconPosition="right"
            >
              Validar y Continuar
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 3: REVIEW & CONFIRM */}
      {currentStep === 3 && (
        <Card className="shadow-lg border-primary/10">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <div className="text-lg font-bold text-neutral">Revisión Final del Lote</div>
                <p className="text-sm text-neutral/50 font-normal">Verifique la información antes de generar los documentos.</p>
              </div>
              <div className="flex gap-4 text-sm font-semibold text-neutral">
                <div className="px-4 py-2 bg-primary/10 border border-primary/15 rounded-xl flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span>Total: {totals.total}</span>
                </div>
                <div className="px-4 py-2 bg-blue-50 border border-blue-150 rounded-xl flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  <span>Jóvenes: {totals.young}</span>
                </div>
                <div className="px-4 py-2 bg-amber-50 border border-amber-150 rounded-xl flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-600" />
                  <span>Adultos: {totals.adult}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-6">
            
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              {/* Tab Filters */}
              <div className="flex bg-primary/5 p-1 rounded-xl border border-primary/15 w-full sm:w-auto">
                <button
                  onClick={() => setActiveTab('valid')}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'valid' 
                      ? 'bg-white text-primary shadow-sm' 
                      : 'text-neutral/60 hover:text-primary'
                  }`}
                >
                  Registros Válidos
                  <span className="ml-1.5 px-2 py-0.5 text-xs font-bold bg-primary/10 text-primary rounded-full">
                    {validMembers.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'pending' 
                      ? 'bg-white text-primary shadow-sm' 
                      : 'text-neutral/60 hover:text-primary'
                  }`}
                >
                  Registros Pendientes
                  <span className="ml-1.5 px-2 py-0.5 text-xs font-bold bg-red-50 text-red-600 rounded-full">
                    {pendingMembers.length}
                  </span>
                </button>
              </div>

              {/* Search Field */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral/40 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o cédula..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-primary/20 bg-primary/5 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
                />
              </div>
            </div>

            {/* Members List */}
            <div className="space-y-3">
              {filteredStep3Members.map(member => {
                const initials = `${member.first_name[0] || ''}${member.last_name[0] || ''}`.toUpperCase();
                return (
                  <div 
                    key={member.identity}
                    className="flex justify-between items-center p-4 bg-white border border-primary/10 rounded-2xl hover:bg-primary/5 transition-all shadow-sm group"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm tracking-wider">
                        {initials}
                      </div>
                      <div>
                        <div className="font-semibold text-neutral">{member.first_name} {member.last_name}</div>
                        <div className="text-xs text-neutral/50 font-medium">C.I. {member.identity} • {member.member_type === 'young' ? 'Joven' : 'Adulto'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {member.status === 'active' ? (
                        <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-green-50 text-green-700 border border-green-200 rounded-full">
                          Válido
                        </span>
                      ) : (
                        <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-full">
                          Pendiente
                        </span>
                      )}
                      
                      <button
                        onClick={() => handleEditMemberClick(member)}
                        className="p-2 border border-gray-200 hover:border-primary rounded-xl text-neutral hover:text-primary transition-all bg-white group-hover:scale-105"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredStep3Members.length === 0 && (
                <div className="p-8 text-center border border-dashed border-primary/20 rounded-2xl text-neutral/40">
                  No se encontraron miembros en esta categoría.
                </div>
              )}
            </div>

          </CardBody>
          <CardFooter>
            <Button
              variant="outline"
              onClick={() => setCurrentStep(2)}
              icon={<ArrowLeft size={18} />}
            >
              Atrás
            </Button>
            <Button
              variant="primary"
              onClick={handleFinalizeBatch}
              icon={<Sparkles size={18} />}
            >
              Generar Lote 🚀
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Manual Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} className="max-w-xl">
        <ModalHeader onClose={() => setIsEditModalOpen(false)}>Editar Información de Miembro</ModalHeader>
        {editingMember && (
          <form onSubmit={handleSaveEditedMember}>
            <ModalBody className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Primer Nombre *"
                  value={editingMember.first_name}
                  onChange={e => setEditingMember({ ...editingMember, first_name: e.target.value })}
                  required
                />
                <Field
                  label="Primer Apellido *"
                  value={editingMember.last_name}
                  onChange={e => setEditingMember({ ...editingMember, last_name: e.target.value })}
                  required
                />
              </div>
              <Field
                label="Fecha de Nacimiento *"
                type="date"
                value={editingMember.birth_date}
                onChange={e => setEditingMember({ ...editingMember, birth_date: e.target.value })}
                required
              />
              <Field
                label="Correo Electrónico"
                type="email"
                value={editingMember.email || ''}
                onChange={e => setEditingMember({ ...editingMember, email: e.target.value })}
              />
              <Field
                label="Teléfono de Contacto"
                value={editingMember.phone || ''}
                onChange={e => setEditingMember({ ...editingMember, phone: e.target.value })}
              />
            </ModalBody>
            <ModalFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary">
                Guardar Cambios
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>

      {/* Scraper Authorization Alert Modal */}
      <Modal isOpen={showAuthAlert} onClose={() => setShowAuthAlert(false)} className="max-w-md">
        <ModalHeader onClose={() => setShowAuthAlert(false)}>
          <span className="flex items-center gap-2 text-amber-600 font-bold">
            <AlertTriangle className="w-5 h-5" />
            Autenticación del Scraper Requerida
          </span>
        </ModalHeader>
        <ModalBody className="space-y-4 text-neutral">
          <p className="text-sm font-normal">
            No se han configurado las credenciales de la <strong>Asociación de Scouts de Venezuela (ASV)</strong> en la aplicación.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-neutral/80 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">¿Por qué es necesario?</p>
              <p className="mt-1">
                La aplicación necesita consultar de forma segura el portal oficial de registro de la ASV. Sin credenciales de cooperador activas, las consultas automáticas fallarán con "Error de Red".
              </p>
            </div>
          </div>
          <p className="text-sm font-semibold">
            Para continuar, por favor siga estos pasos:
          </p>
          <ol className="list-decimal list-inside text-sm space-y-2 text-neutral/80">
            <li>Haga clic en el icono de <strong>Ajustes (engranaje ⚙️)</strong> en la barra de navegación superior.</li>
            <li>Ingrese su correo y contraseña oficiales de la ASV.</li>
            <li>Guarde los ajustes e intente la verificación de nuevo.</li>
          </ol>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={() => setShowAuthAlert(false)}
            fullWidth
          >
            Entendido
          </Button>
        </ModalFooter>
      </Modal>

      {/* Scraper Login Error Modal */}
      <Modal isOpen={authError !== null} onClose={() => setAuthError(null)} className="max-w-md">
        <ModalHeader onClose={() => setAuthError(null)}>
          <span className="flex items-center gap-2 text-red-600 font-bold">
            <AlertCircle className="w-5 h-5" />
            Error de Autenticación ASV
          </span>
        </ModalHeader>
        <ModalBody className="space-y-4 text-neutral">
          <p className="text-sm font-normal">
            Se intentó iniciar sesión con sus credenciales guardadas de la ASV, pero el servidor retornó un error de acceso:
          </p>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
            <p className="font-mono break-all">{authError}</p>
          </div>
          <p className="text-sm">
            Por favor, haga clic en el icono de <strong>Ajustes (engranaje ⚙️)</strong> en la parte superior para verificar que su correo y contraseña sean correctos y guardarlos nuevamente.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setAuthError(null)}
            fullWidth
          >
            Cerrar
          </Button>
        </ModalFooter>
      </Modal>

      {/* Region Selector Modal */}
      <Modal isOpen={isRegionModalOpen} onClose={() => setIsRegionModalOpen(false)} className="max-w-md">
        <ModalHeader onClose={() => setIsRegionModalOpen(false)}>
          <span className="flex items-center gap-2 text-primary font-bold">
            <Sparkles className="w-5 h-5 text-primary" />
            Seleccionar Región Scout
          </span>
        </ModalHeader>
        <ModalBody className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral/40 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar región..."
              value={regionSearch}
              onChange={e => setRegionSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-primary/20 bg-primary/5 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all h-[46px]"
            />
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
            {filteredRegionsList.length === 0 ? (
              <p className="text-sm text-neutral/40 text-center py-4">No se encontraron regiones</p>
            ) : (
              filteredRegionsList.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setValue('regionId', r.id.toString(), { shouldValidate: true });
                    setIsRegionModalOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between group ${
                    selectedRegionId === r.id.toString()
                      ? 'bg-primary text-white font-semibold'
                      : 'hover:bg-primary/5 text-neutral'
                  }`}
                >
                  <span>{r.name}</span>
                  {selectedRegionId === r.id.toString() && <Check className="w-4 h-4" />}
                </button>
              ))
            )}
          </div>
        </ModalBody>
      </Modal>

      {/* District Selector Modal */}
      <Modal isOpen={isDistrictModalOpen} onClose={() => setIsDistrictModalOpen(false)} className="max-w-md">
        <ModalHeader onClose={() => setIsDistrictModalOpen(false)}>
          <span className="flex items-center gap-2 text-primary font-bold">
            <Sparkles className="w-5 h-5 text-primary" />
            Seleccionar Distrito Scout
          </span>
        </ModalHeader>
        <ModalBody className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral/40 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar distrito..."
              value={districtSearch}
              onChange={e => setDistrictSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-primary/20 bg-primary/5 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all h-[46px]"
            />
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
            {filteredDistrictsList.length === 0 ? (
              <p className="text-sm text-neutral/40 text-center py-4">No se encontraron distritos</p>
            ) : (
              filteredDistrictsList.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setValue('districtId', d.id.toString(), { shouldValidate: true });
                    setIsDistrictModalOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between group ${
                    selectedDistrictId === d.id.toString()
                      ? 'bg-primary text-white font-semibold'
                      : 'hover:bg-primary/5 text-neutral'
                  }`}
                >
                  <span>{d.name}</span>
                  {selectedDistrictId === d.id.toString() && <Check className="w-4 h-4" />}
                </button>
              ))
            )}
          </div>
        </ModalBody>
      </Modal>

      {/* Group Selector Modal */}
      <Modal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} className="max-w-md">
        <ModalHeader onClose={() => setIsGroupModalOpen(false)}>
          <span className="flex items-center gap-2 text-primary font-bold">
            <Sparkles className="w-5 h-5 text-primary" />
            Seleccionar Grupo Scout
          </span>
        </ModalHeader>
        <ModalBody className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral/40 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar grupo..."
              value={groupSearch}
              onChange={e => setGroupSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-primary/20 bg-primary/5 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all h-[46px]"
            />
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
            {filteredGroupsList.length === 0 ? (
              <p className="text-sm text-neutral/40 text-center py-4">No se encontraron grupos</p>
            ) : (
              filteredGroupsList.map(g => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setValue('groupId', g.id.toString(), { shouldValidate: true });
                    setIsGroupModalOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between group ${
                    selectedGroupId === g.id.toString()
                      ? 'bg-primary text-white font-semibold'
                      : 'hover:bg-primary/5 text-neutral'
                  }`}
                >
                  <span>{g.name}</span>
                  {selectedGroupId === g.id.toString() && <Check className="w-4 h-4" />}
                </button>
              ))
            )}
          </div>
        </ModalBody>
      </Modal>

    </div>
  );
};
export default NewBatchWizard;

