import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Award,
  Users,
  Search,
  RotateCcw,
  CheckCircle2,
  FileText,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';

import { Card, CardHeader, CardBody } from '../../../components/Card';
import { Button } from '../../../components/Button';
import {
  getHierarchyData,
  createBatch,
  createMember,
  getMemberStatus,
  RECOGNITION_TYPES
} from '../api';
import {
  Batch,
  ScoutMember,
  Region,
  District,
  ScoutGroup,
  ScoutUnit,
  getUnitLabel
} from '../types';
import { generateRecognitionCode } from '../utils/codeGenerator';
import { splitFullName } from '../utils/nameHelper';
import {
  getAllRecognitionTypes,
  downloadSingleCertificatePdf,
  RecognitionType
} from '../../recognitions';
import { useAuth } from '../../auth';

interface SuccessEmissionData {
  batch: Batch;
  member: ScoutMember;
  recognitionName: string;
}

export const QuickRecognition: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Hierarchy and dynamic recognition types state
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [groups, setGroups] = useState<ScoutGroup[]>([]);
  const [recognitionTypes, setRecognitionTypes] = useState<RecognitionType[]>([]);
  const [loadingHierarchy, setLoadingHierarchy] = useState(true);

  // Form State
  const [recognitionType, setRecognitionType] = useState<string>('');
  const [regionId, setRegionId] = useState<string>('');
  const [districtId, setDistrictId] = useState<string>('');
  const [groupId, setGroupId] = useState<string>('');
  const [comment, setComment] = useState<string>('');

  const [unit, setUnit] = useState<ScoutUnit>('manada');
  const [identity, setIdentity] = useState<string>('');
  const [firstNames, setFirstNames] = useState<string>('');
  const [lastNames, setLastNames] = useState<string>('');
  const [recognitionCode, setRecognitionCode] = useState<string>(() => generateRecognitionCode('REC'));
  const [birthDate, setBirthDate] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');

  // Scraper State
  const [isSearchingScraper, setIsSearchingScraper] = useState<boolean>(false);
  const [scraperStatus, setScraperStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [scraperMsg, setScraperMsg] = useState<string>('');
  const [verifiedCedula, setVerifiedCedula] = useState<string | null>(null);

  // Validation & Submission State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Success State
  const [successData, setSuccessData] = useState<SuccessEmissionData | null>(null);

  const triggerToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 4000);
  }, []);

  // Fetch initial hierarchy and recognition types
  useEffect(() => {
    Promise.all([
      getHierarchyData(),
      getAllRecognitionTypes(user?.uid)
    ])
      .then(([hierarchy, recTypes]) => {
        setRegions(hierarchy.regions || []);
        setDistricts(hierarchy.districts || []);
        setGroups(hierarchy.groups || []);
        setRecognitionTypes(recTypes || []);
      })
      .catch((err) => {
        console.error('Error loading quick recognition metadata:', err);
      })
      .finally(() => {
        setLoadingHierarchy(false);
      });
  }, [user?.uid]);

  // Filtered dropdown lists
  const filteredDistricts = React.useMemo(() => {
    if (!regionId || regionId === '0') return [];
    const dists = districts.filter(d => d.id !== 0 && d.region_id === Number(regionId));
    return [{ id: 0, name: 'No aplica', region_id: Number(regionId) }, ...dists];
  }, [districts, regionId]);

  const filteredGroups = React.useMemo(() => {
    if (!districtId || districtId === '0') return [];
    const grps = groups.filter(g => g.id !== 0 && g.district_id === Number(districtId));
    return [{ id: 0, name: 'No aplica', district_id: Number(districtId) }, ...grps];
  }, [groups, districtId]);

  const availableRecognitionTypes = recognitionTypes.length > 0 ? recognitionTypes : RECOGNITION_TYPES;

  // Scraper Lookup
  const handleConsult = async () => {
    const cleanCedula = identity.trim();
    if (!cleanCedula) {
      setErrors(prev => ({ ...prev, identity: 'Ingrese una cédula para consultar' }));
      return;
    }

    setIsSearchingScraper(true);
    setScraperStatus('idle');
    setScraperMsg('');

    try {
      const details = await getMemberStatus(cleanCedula);
      if (details?.nombre_completo) {
        const { first_names, last_names } = splitFullName(details.nombre_completo);
        setFirstNames(first_names);
        setLastNames(last_names);
        if (details.fecha_nacimiento) setBirthDate(details.fecha_nacimiento);
        if (details.correo_electronico) setEmail(details.correo_electronico);
        if (details.telefono) setPhone(details.telefono);

        setScraperStatus('success');
        setVerifiedCedula(cleanCedula);
        setScraperMsg(`✓ Miembro encontrado: ${details.nombre_completo}`);
        setErrors(prev => {
          const next = { ...prev };
          delete next.identity;
          delete next.firstNames;
          delete next.lastNames;
          return next;
        });
        triggerToast('Datos obtenidos de Sistema de Registro exitosamente', 'success');
      } else {
        setScraperStatus('error');
        setVerifiedCedula(null);
        setScraperMsg('No se encontraron datos en Sistema de Registro.');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setScraperStatus('error');
      setVerifiedCedula(null);
      if (errorMsg.includes('No registrado')) {
        setScraperMsg('Usuario no registrado en Sistema de Registro.');
      } else {
        setScraperMsg('Error al consultar Sistema de Registro.');
      }
    } finally {
      setIsSearchingScraper(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const isNoScout = unit === 'no_scout';

    if (!recognitionType) newErrors.recognitionType = 'Debe seleccionar un tipo de reconocimiento';
    if (!isNoScout) {
      if (!regionId && regionId !== '0') newErrors.regionId = 'Debe seleccionar una región';
      if (!districtId && districtId !== '0') newErrors.districtId = 'Debe seleccionar un distrito';
      if (!groupId && groupId !== '0') newErrors.groupId = 'Debe seleccionar un grupo scout';
    }
    if (!identity.trim()) {
      newErrors.identity = 'Debe ingresar la cédula de identidad';
    } else if (!isNoScout && (scraperStatus !== 'success' || verifiedCedula !== identity.trim())) {
      newErrors.identity = 'Debe consultar el sistema de registro para verificar la cédula del scout antes de emitir el reconocimiento.';
    }
    if (!firstNames.trim()) newErrors.firstNames = 'Debe ingresar el o los nombres';
    if (!lastNames.trim()) newErrors.lastNames = 'Debe ingresar el o los apellidos';
    if (!recognitionCode.trim()) newErrors.recognitionCode = 'Debe generar o ingresar un código de reconocimiento';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const finalRegionId = (unit === 'no_scout' && (!regionId || regionId === '')) ? 0 : Number(regionId);
      const finalDistrictId = (unit === 'no_scout' && (!districtId || districtId === '')) ? 0 : Number(districtId);
      const finalGroupId = (unit === 'no_scout' && (!groupId || groupId === '')) ? 0 : Number(groupId);

      // 1. Create single-member Batch
      const createdBatch = await createBatch({
        comment: comment.trim() || undefined,
        region_id: finalRegionId,
        district_id: finalDistrictId,
        group_id: finalGroupId,
        unit_scope: unit,
        recognition_type: recognitionType,
        user_id: user?.uid
      }, user?.uid);

      // 2. Create Member
      const memberType = (unit === 'institucional' || unit === 'no_scout') ? 'adult' : 'young';
      const createdMember = await createMember({
        identity: identity.trim(),
        first_names: firstNames.trim(),
        last_names: lastNames.trim(),
        birth_date: birthDate || '2000-01-01',
        email: email || undefined,
        phone: phone || undefined,
        unit,
        member_type: memberType,
        status: 'active',
        verified_in_registry: unit !== 'no_scout',
        batch_id: createdBatch.id,
        recognition_code: recognitionCode.trim(),
        user_id: user?.uid
      }, user?.uid);

      // 3. Resolve Recognition Object
      const found = availableRecognitionTypes.find(r => r.id === recognitionType);
      const resolvedRec: RecognitionType = {
        id: found?.id || recognitionType,
        name: found?.name || recognitionType,
        created_at: (found && 'created_at' in found && found.created_at) ? (found as RecognitionType).created_at : new Date().toISOString(),
        ...(found && 'template' in found && found.template ? { template: (found as RecognitionType).template } : {})
      };

      // 4. Download Single Certificate PDF
      await downloadSingleCertificatePdf({
        member: createdMember,
        batch: createdBatch,
        recognition: resolvedRec,
        hierarchy: { regions, districts, groups }
      });

      // 5. Set Success Screen
      setSuccessData({
        batch: createdBatch,
        member: createdMember,
        recognitionName: resolvedRec.name
      });

      triggerToast('¡Diploma generado y descargado exitosamente!', 'success');
    } catch (err) {
      console.error('Error in quick recognition emission:', err);
      triggerToast('Ocurrió un error al emitir el reconocimiento.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmitAnother = () => {
    setSuccessData(null);
    setIdentity('');
    setFirstNames('');
    setLastNames('');
    setBirthDate('');
    setEmail('');
    setPhone('');
    setRecognitionCode(generateRecognitionCode('REC'));
    setComment('');
    setErrors({});
    setScraperStatus('idle');
    setScraperMsg('');
    setVerifiedCedula(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans py-4">
      {/* Toast Notification */}
      {showToast && (
        <div
          role="alert"
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 text-white px-5 py-3 rounded-2xl shadow-xl border animate-fade-in ${toastType === 'success'
            ? 'bg-neutral border-primary/30'
            : 'bg-red-700 border-red-500/30'
            }`}
        >
          {toastType === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0" />
          )}
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Success View */}
      {successData ? (
        <Card className="shadow-sm border border-gray-200 overflow-hidden bg-white">
          <div className="bg-primary/5 border-b border-primary/10 p-8 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral">
              ¡Reconocimiento Emitido con Éxito!
            </h2>
            <p className="text-neutral/60 text-sm mt-2 max-w-md mx-auto">
              El diploma individual ha sido generado y descargado automáticamente en su dispositivo.
            </p>
          </div>

          <CardBody className="p-6 sm:p-8 space-y-6">
            {/* Details Summary */}
            <div className="bg-primary/5 rounded-2xl p-5 border border-primary/15">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs uppercase text-neutral/50 font-bold block">Homenajeado</span>
                  <span className="font-bold text-neutral text-base">
                    {successData.member.first_names} {successData.member.last_names}
                  </span>
                  <span className="text-xs text-neutral/60 block font-mono mt-0.5">
                    C.I. {successData.member.identity}
                  </span>
                </div>
                <div>
                  <span className="text-xs uppercase text-neutral/50 font-bold block">Reconocimiento</span>
                  <span className="font-bold text-primary text-base">
                    {successData.recognitionName}
                  </span>
                  <span className="text-xs text-neutral/60 block font-mono mt-0.5">
                    Código: {successData.member.recognition_code}
                  </span>
                </div>
                <div>
                  <span className="text-xs uppercase text-neutral/50 font-bold block">Unidad / Categoría</span>
                  <span className="font-semibold text-neutral">
                    {getUnitLabel(successData.member.unit)}
                  </span>
                </div>
                <div>
                  <span className="text-xs uppercase text-neutral/50 font-bold block">Lote Creado</span>
                  <span className="font-bold text-neutral">
                    Lote #{successData.batch.id}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                variant="primary"
                onClick={handleEmitAnother}
                icon={<Zap className="w-4 h-4" />}
                className="w-full sm:w-auto shadow-sm"
              >
                Emitir otro reconocimiento rápido
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/lotes/${successData.batch.id}`)}
                icon={<FileText className="w-4 h-4" />}
                className="w-full sm:w-auto shadow-sm"
              >
                Ver Lote Creado
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/lotes')}
                icon={<ArrowLeft className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Ir al Listado de Lotes
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        /* Form View */
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Zap className="w-6 h-6 fill-amber-500/20" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral tracking-tight flex items-center gap-2">
                Emisión Rápida de Reconocimiento
              </h1>
              <p className="text-sm text-neutral/60 mt-0.5">
                Emite y descarga un diploma individual de forma inmediata en un solo paso.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Card: 1. Datos del Reconocimiento */}
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="bg-[#faf8f5] border-b border-gray-200 text-neutral font-bold flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                1. Datos del Reconocimiento
              </CardHeader>
              <CardBody className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Tipo de Reconocimiento */}
                  <div className="space-y-1 md:col-span-2">
                    <label htmlFor="quick-rec-type" className="block uppercase text-xs font-bold tracking-wide text-neutral">
                      Tipo de Reconocimiento *
                    </label>
                    <select
                      id="quick-rec-type"
                      aria-label="Tipo de Reconocimiento"
                      value={recognitionType}
                      onChange={(e) => {
                        setRecognitionType(e.target.value);
                        if (errors.recognitionType) {
                          setErrors(prev => ({ ...prev, recognitionType: '' }));
                        }
                      }}
                      className={`w-full rounded-field px-4 transition-all bg-primary/5 border text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm h-[46px] ${errors.recognitionType ? 'border-red-300 ring-2 ring-red-500 bg-red-50' : 'border-primary/20'
                        }`}
                      disabled={loadingHierarchy}
                    >
                      <option value="">Seleccione un tipo de reconocimiento</option>
                      {availableRecognitionTypes.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    {errors.recognitionType && (
                      <p className="text-xs text-red-600 font-medium mt-1">{errors.recognitionType}</p>
                    )}
                  </div>

                  {/* Region */}
                  <div className="space-y-1">
                    <label htmlFor="quick-region" className="block uppercase text-xs font-bold tracking-wide text-neutral">
                      Región Scout {unit === 'no_scout' ? '(Opcional)' : '*'}
                    </label>
                    <select
                      id="quick-region"
                      aria-label="Región Scout"
                      value={regionId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRegionId(val);
                        if (val === '0') {
                          setDistrictId('0');
                          setGroupId('0');
                        } else {
                          setDistrictId('');
                          setGroupId('');
                        }
                        if (errors.regionId) {
                          setErrors(prev => ({ ...prev, regionId: '', districtId: '', groupId: '' }));
                        }
                      }}
                      className={`w-full rounded-field px-4 transition-all bg-primary/5 border text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm h-[46px] ${errors.regionId ? 'border-red-300 ring-2 ring-red-500 bg-red-50' : 'border-primary/20'
                        }`}
                      disabled={loadingHierarchy}
                    >
                      <option value="">{unit === 'no_scout' ? 'No aplica' : 'Seleccione una región'}</option>
                      <option value="0">No aplica</option>
                      {regions.filter(r => r.id !== 0).map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    {errors.regionId && (
                      <p className="text-xs text-red-600 font-medium mt-1">{errors.regionId}</p>
                    )}
                  </div>

                  {/* District */}
                  <div className="space-y-1">
                    <label htmlFor="quick-district" className="block uppercase text-xs font-bold tracking-wide text-neutral">
                      Distrito Scout {unit === 'no_scout' ? '(Opcional)' : '*'}
                    </label>
                    <select
                      id="quick-district"
                      aria-label="Distrito Scout"
                      value={regionId === '0' ? '0' : districtId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDistrictId(val);
                        if (val === '0') {
                          setGroupId('0');
                        } else {
                          setGroupId('');
                        }
                        if (errors.districtId) {
                          setErrors(prev => ({ ...prev, districtId: '', groupId: '' }));
                        }
                      }}
                      disabled={!regionId || regionId === '0' || loadingHierarchy}
                      className={`w-full rounded-field px-4 transition-all bg-primary/5 border text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm h-[46px] ${(!regionId || regionId === '0') ? 'bg-gray-100 opacity-50 cursor-not-allowed border-gray-200' : (
                        errors.districtId ? 'border-red-300 ring-2 ring-red-500 bg-red-50' : 'border-primary/20'
                      )
                        }`}
                    >
                      <option value="">{unit === 'no_scout' ? 'No aplica' : 'Seleccione un distrito'}</option>
                      <option value="0">No aplica</option>
                      {filteredDistricts.filter(d => d.id !== 0).map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    {errors.districtId && (
                      <p className="text-xs text-red-600 font-medium mt-1">{errors.districtId}</p>
                    )}
                  </div>

                  {/* Group */}
                  <div className="space-y-1">
                    <label htmlFor="quick-group" className="block uppercase text-xs font-bold tracking-wide text-neutral">
                      Grupo Scout {unit === 'no_scout' ? '(Opcional)' : '*'}
                    </label>
                    <select
                      id="quick-group"
                      aria-label="Grupo Scout"
                      value={(regionId === '0' || districtId === '0') ? '0' : groupId}
                      onChange={(e) => {
                        setGroupId(e.target.value);
                        if (errors.groupId) {
                          setErrors(prev => ({ ...prev, groupId: '' }));
                        }
                      }}
                      disabled={!districtId || districtId === '0' || regionId === '0' || loadingHierarchy}
                      className={`w-full rounded-field px-4 transition-all bg-primary/5 border text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm h-[46px] ${(!districtId || districtId === '0' || regionId === '0') ? 'bg-gray-100 opacity-50 cursor-not-allowed border-gray-200' : (
                        errors.groupId ? 'border-red-300 ring-2 ring-red-500 bg-red-50' : 'border-primary/20'
                      )
                        }`}
                    >
                      <option value="">{unit === 'no_scout' ? 'No aplica' : 'Seleccione un grupo scout'}</option>
                      <option value="0">No aplica</option>
                      {filteredGroups.filter(g => g.id !== 0).map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                    {errors.groupId && (
                      <p className="text-xs text-red-600 font-medium mt-1">{errors.groupId}</p>
                    )}
                  </div>

                  {/* Comentario / Motivo (Opcional) */}
                  <div className="space-y-1">
                    <label htmlFor="quick-comment" className="block uppercase text-xs font-bold tracking-wide text-neutral">
                      Comentario / Motivo (Opcional)
                    </label>
                    <input
                      id="quick-comment"
                      aria-label="Comentario / Motivo (Opcional)"
                      type="text"
                      placeholder="Ej. Reconocimiento individual por labor destacada"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full rounded-field px-4 transition-all bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm h-[46px]"
                    />
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Card: 2. Datos del Homenajeado */}
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="bg-[#faf8f5] border-b border-gray-200 text-neutral font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                2. Datos del Homenajeado
              </CardHeader>
              <CardBody className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Unidad / Categoría */}
                  <div className="space-y-1">
                    <label htmlFor="quick-unit" className="block uppercase text-xs font-bold tracking-wide text-neutral">
                      Unidad / Categoría *
                    </label>
                    <select
                      id="quick-unit"
                      aria-label="Unidad / Categoría"
                      value={unit}
                      onChange={(e) => {
                        const newUnit = e.target.value as ScoutUnit;
                        setUnit(newUnit);
                        setScraperStatus('idle');
                        setScraperMsg('');
                        setVerifiedCedula(null);
                      }}
                      className="w-full rounded-field px-4 transition-all bg-primary/5 border border-primary/20 text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm h-[46px]"
                    >
                      <option value="manada">Manada</option>
                      <option value="tropa">Tropa</option>
                      <option value="caminantes">Caminantes</option>
                      <option value="clan">Clan</option>
                      <option value="institucional">Institucional</option>
                      <option value="no_scout">No scout</option>
                    </select>
                  </div>

                  {/* Cédula + Sistema de Registro Query */}
                  <div className="space-y-1">
                    <label htmlFor="quick-identity" className="block uppercase text-xs font-bold tracking-wide text-neutral">
                      Cédula de Identidad *
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="quick-identity"
                        aria-label="Cédula de Identidad"
                        type="text"
                        placeholder="Ej. V-12.345.678"
                        value={identity}
                        onChange={(e) => {
                          setIdentity(e.target.value);
                          setVerifiedCedula(null);
                          setScraperStatus('idle');
                          setScraperMsg('');
                          if (errors.identity) {
                            setErrors(prev => ({ ...prev, identity: '' }));
                          }
                        }}
                        className={`flex-1 rounded-field px-4 transition-all bg-primary/5 border text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm h-[46px] ${errors.identity ? 'border-red-300 ring-2 ring-red-500 bg-red-50' : 'border-primary/20'
                          }`}
                      />
                      {unit !== 'no_scout' && (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isSearchingScraper || !identity.trim()}
                          onClick={handleConsult}
                          icon={<Search className="w-4 h-4" />}
                          className="flex-shrink-0 h-[46px]"
                        >
                          {isSearchingScraper ? 'Consultando...' : 'Consultar'}
                        </Button>
                      )}
                    </div>
                    {errors.identity && (
                      <p className="text-xs text-red-600 font-medium mt-1">{errors.identity}</p>
                    )}
                    {unit === 'no_scout' && (
                      <p className="text-xs text-neutral/50 italic mt-1">(No requiere verificación Sistema de Registro)</p>
                    )}
                    {scraperMsg && (
                      <p className={`text-xs font-medium mt-1 ${scraperStatus === 'success' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {scraperMsg}
                      </p>
                    )}
                  </div>

                  {/* Nombres */}
                  <div className="space-y-1">
                    <label htmlFor="quick-first-names" className="block uppercase text-xs font-bold tracking-wide text-neutral">
                      Nombres *
                    </label>
                    <input
                      id="quick-first-names"
                      aria-label="Nombres"
                      type="text"
                      placeholder="Ej. Roberto Carlos"
                      value={firstNames}
                      onChange={(e) => {
                        setFirstNames(e.target.value);
                        if (errors.firstNames) {
                          setErrors(prev => ({ ...prev, firstNames: '' }));
                        }
                      }}
                      className={`w-full rounded-field px-4 transition-all bg-primary/5 border text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm h-[46px] ${errors.firstNames ? 'border-red-300 ring-2 ring-red-500 bg-red-50' : 'border-primary/20'
                        }`}
                    />
                    {errors.firstNames && (
                      <p className="text-xs text-red-600 font-medium mt-1">{errors.firstNames}</p>
                    )}
                  </div>

                  {/* Apellidos */}
                  <div className="space-y-1">
                    <label htmlFor="quick-last-names" className="block uppercase text-xs font-bold tracking-wide text-neutral">
                      Apellidos *
                    </label>
                    <input
                      id="quick-last-names"
                      aria-label="Apellidos"
                      type="text"
                      placeholder="Ej. Pérez Silva"
                      value={lastNames}
                      onChange={(e) => {
                        setLastNames(e.target.value);
                        if (errors.lastNames) {
                          setErrors(prev => ({ ...prev, lastNames: '' }));
                        }
                      }}
                      className={`w-full rounded-field px-4 transition-all bg-primary/5 border text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm h-[46px] ${errors.lastNames ? 'border-red-300 ring-2 ring-red-500 bg-red-50' : 'border-primary/20'
                        }`}
                    />
                    {errors.lastNames && (
                      <p className="text-xs text-red-600 font-medium mt-1">{errors.lastNames}</p>
                    )}
                  </div>

                  {/* Código de Reconocimiento */}
                  <div className="space-y-1 md:col-span-2">
                    <label htmlFor="quick-rec-code" className="block uppercase text-xs font-bold tracking-wide text-neutral">
                      Código de Reconocimiento *
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="quick-rec-code"
                        aria-label="Código de Reconocimiento"
                        type="text"
                        placeholder="REC-XXXXXX"
                        value={recognitionCode}
                        onChange={(e) => {
                          setRecognitionCode(e.target.value.toUpperCase());
                          if (errors.recognitionCode) {
                            setErrors(prev => ({ ...prev, recognitionCode: '' }));
                          }
                        }}
                        className={`flex-1 rounded-field px-4 font-mono font-bold transition-all bg-primary/5 border text-neutral focus:outline-none focus:ring-2 focus:ring-primary text-sm h-[46px] ${errors.recognitionCode ? 'border-red-300 ring-2 ring-red-500 bg-red-50' : 'border-primary/20'
                          }`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setRecognitionCode(generateRecognitionCode('REC'));
                          if (errors.recognitionCode) {
                            setErrors(prev => ({ ...prev, recognitionCode: '' }));
                          }
                        }}
                        icon={<RotateCcw className="w-4 h-4" />}
                        className="flex-shrink-0 h-[46px]"
                      >
                        Regenerar
                      </Button>
                    </div>
                    {errors.recognitionCode && (
                      <p className="text-xs text-red-600 font-medium mt-1">{errors.recognitionCode}</p>
                    )}
                    <p className="text-xs text-neutral/40 mt-1">
                      Código único auto-generado para verificación y diploma. Puede editarse manualmente si es necesario.
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Form Submit Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSubmitting || loadingHierarchy}
                icon={<Zap className="w-5 h-5 fill-current" />}
                className="w-full sm:w-auto shadow-md"
              >
                {isSubmitting ? 'Emitiendo y Generando Diploma...' : 'Emitir y Descargar Diploma'}
              </Button>
            </div>
          </form>
        </div>
      )
      }
    </div >
  );
};
