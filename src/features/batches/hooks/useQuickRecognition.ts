import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  ScoutUnit
} from '../types';
import { generateRecognitionCode } from '../utils/codeGenerator';
import { splitFullName } from '../utils/nameHelper';
import {
  getAllRecognitionTypes,
  downloadSingleCertificatePdf,
  RecognitionType
} from '../../recognitions';
import { useAuth } from '../../auth';

export interface SuccessEmissionData {
  batch: Batch;
  member: ScoutMember;
  recognitionName: string;
}

export interface QuickRecognitionValidationParams {
  recognitionType: string;
  unit: ScoutUnit;
  regionId: string;
  districtId: string;
  groupId: string;
  identity: string;
  scraperStatus: 'idle' | 'success' | 'error';
  verifiedCedula: string | null;
  firstNames: string;
  lastNames: string;
  recognitionCode: string;
}

function validateHierarchyFields(
  regionId: string,
  districtId: string,
  groupId: string,
  isNoScout: boolean
): Record<string, string> {
  if (isNoScout) return {};
  const errors: Record<string, string> = {};
  if (!regionId && regionId !== '0') errors.regionId = 'Debe seleccionar una región';
  if (!districtId && districtId !== '0') errors.districtId = 'Debe seleccionar un distrito';
  if (!groupId && groupId !== '0') errors.groupId = 'Debe seleccionar un grupo scout';
  return errors;
}

function validateIdentityField(
  identity: string,
  isNoScout: boolean,
  scraperStatus: string,
  verifiedCedula: string | null
): Record<string, string> {
  const clean = identity.trim();
  if (!clean) return { identity: 'Debe ingresar la cédula de identidad' };
  if (!isNoScout && (scraperStatus !== 'success' || verifiedCedula !== clean)) {
    return { identity: 'Debe consultar el sistema de registro para verificar la cédula del scout antes de emitir el reconocimiento.' };
  }
  return {};
}

function validatePersonalFields(firstNames: string, lastNames: string, recognitionCode: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!firstNames.trim()) errors.firstNames = 'Debe ingresar el o los nombres';
  if (!lastNames.trim()) errors.lastNames = 'Debe ingresar el o los apellidos';
  if (!recognitionCode.trim()) errors.recognitionCode = 'Debe generar o ingresar un código de reconocimiento';
  return errors;
}

export function validateQuickRecognitionFields(params: QuickRecognitionValidationParams): Record<string, string> {
  const isNoScout = params.unit === 'no_scout';
  const errors: Record<string, string> = {};

  if (!params.recognitionType) {
    errors.recognitionType = 'Debe seleccionar un tipo de reconocimiento';
  }

  Object.assign(errors, validateHierarchyFields(params.regionId, params.districtId, params.groupId, isNoScout));
  Object.assign(errors, validateIdentityField(params.identity, isNoScout, params.scraperStatus, params.verifiedCedula));
  Object.assign(errors, validatePersonalFields(params.firstNames, params.lastNames, params.recognitionCode));

  return errors;
}

export function resolveQuickRecognitionType(
  recognitionType: string,
  availableRecognitionTypes: (RecognitionType | { id: string; name: string })[]
): RecognitionType {
  const found = availableRecognitionTypes.find(r => r.id === recognitionType);
  return {
    id: found?.id ?? recognitionType,
    name: found?.name ?? recognitionType,
    created_at: (found && 'created_at' in found && found.created_at) ? (found as RecognitionType).created_at : new Date().toISOString(),
    ...(found && 'template' in found && found.template ? { template: (found as RecognitionType).template } : {})
  };
}

export interface QuickEmissionExecutionParams {
  comment: string;
  regionId: string;
  districtId: string;
  groupId: string;
  unit: ScoutUnit;
  recognitionType: string;
  identity: string;
  firstNames: string;
  lastNames: string;
  birthDate: string;
  email: string;
  phone: string;
  recognitionCode: string;
  userId?: string;
  availableRecognitionTypes: (RecognitionType | { id: string; name: string })[];
  regions: Region[];
  districts: District[];
  groups: ScoutGroup[];
}

export async function executeQuickEmission(params: QuickEmissionExecutionParams): Promise<SuccessEmissionData> {
  const {
    comment,
    regionId,
    districtId,
    groupId,
    unit,
    recognitionType,
    identity,
    firstNames,
    lastNames,
    birthDate,
    email,
    phone,
    recognitionCode,
    userId,
    availableRecognitionTypes,
    regions,
    districts,
    groups
  } = params;

  const isNoScout = unit === 'no_scout';
  const finalRegionId = (isNoScout && (!regionId || regionId === '')) ? 0 : Number(regionId);
  const finalDistrictId = (isNoScout && (!districtId || districtId === '')) ? 0 : Number(districtId);
  const finalGroupId = (isNoScout && (!groupId || groupId === '')) ? 0 : Number(groupId);

  // 1. Create single-member Batch
  const createdBatch = await createBatch({
    comment: comment.trim() || undefined,
    region_id: finalRegionId,
    district_id: finalDistrictId,
    group_id: finalGroupId,
    unit_scope: unit,
    recognition_type: recognitionType,
    user_id: userId
  }, userId);

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
    user_id: userId
  }, userId);

  // 3. Resolve Recognition Object
  const resolvedRec = resolveQuickRecognitionType(recognitionType, availableRecognitionTypes);

  // 4. Download Single Certificate PDF
  await downloadSingleCertificatePdf({
    member: createdMember,
    batch: createdBatch,
    recognition: resolvedRec,
    hierarchy: { regions, districts, groups }
  });

  return {
    batch: createdBatch,
    member: createdMember,
    recognitionName: resolvedRec.name
  };
}

export function useQuickRecognition() {
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
        setRegions(hierarchy.regions ?? []);
        setDistricts(hierarchy.districts ?? []);
        setGroups(hierarchy.groups ?? []);
        setRecognitionTypes(recTypes ?? []);
      })
      .catch((err) => {
        console.error('Error loading quick recognition metadata:', err);
      })
      .finally(() => {
        setLoadingHierarchy(false);
      });
  }, [user?.uid]);

  // Filtered dropdown lists
  const filteredDistricts = useMemo(() => {
    if (!regionId || regionId === '0') return [];
    const dists = districts.filter(d => d.id !== 0 && d.region_id === Number(regionId));
    return [{ id: 0, name: 'No aplica', region_id: Number(regionId) }, ...dists];
  }, [districts, regionId]);

  const filteredGroups = useMemo(() => {
    if (!districtId || districtId === '0') return [];
    const grps = groups.filter(g => g.id !== 0 && g.district_id === Number(districtId));
    return [{ id: 0, name: 'No aplica', district_id: Number(districtId) }, ...grps];
  }, [groups, districtId]);

  const availableRecognitionTypes = recognitionTypes.length > 0 ? recognitionTypes : RECOGNITION_TYPES;

  // Region change cascading handler
  const handleRegionChange = useCallback((val: string) => {
    setRegionId(val);
    if (val === '0') {
      setDistrictId('0');
      setGroupId('0');
    } else {
      setDistrictId('');
      setGroupId('');
    }
    setErrors(prev => {
      if (prev.regionId || prev.districtId || prev.groupId) {
        const next = { ...prev };
        delete next.regionId;
        delete next.districtId;
        delete next.groupId;
        return next;
      }
      return prev;
    });
  }, []);

  // District change cascading handler
  const handleDistrictChange = useCallback((val: string) => {
    setDistrictId(val);
    if (val === '0') {
      setGroupId('0');
    } else {
      setGroupId('');
    }
    setErrors(prev => {
      if (prev.districtId || prev.groupId) {
        const next = { ...prev };
        delete next.districtId;
        delete next.groupId;
        return next;
      }
      return prev;
    });
  }, []);

  // Group change handler
  const handleGroupChange = useCallback((val: string) => {
    setGroupId(val);
    setErrors(prev => {
      if (prev.groupId) {
        const next = { ...prev };
        delete next.groupId;
        return next;
      }
      return prev;
    });
  }, []);

  // Recognition type change handler
  const handleRecognitionTypeChange = useCallback((val: string) => {
    setRecognitionType(val);
    setErrors(prev => {
      if (prev.recognitionType) {
        const next = { ...prev };
        delete next.recognitionType;
        return next;
      }
      return prev;
    });
  }, []);

  // Unit change handler
  const handleUnitChange = useCallback((newUnit: ScoutUnit) => {
    setUnit(newUnit);
    setScraperStatus('idle');
    setScraperMsg('');
    setVerifiedCedula(null);
  }, []);

  // Identity change handler
  const handleIdentityChange = useCallback((val: string) => {
    setIdentity(val);
    setVerifiedCedula(null);
    setScraperStatus('idle');
    setScraperMsg('');
    setErrors(prev => {
      if (prev.identity) {
        const next = { ...prev };
        delete next.identity;
        return next;
      }
      return prev;
    });
  }, []);

  // First names change handler
  const handleFirstNamesChange = useCallback((val: string) => {
    setFirstNames(val);
    setErrors(prev => {
      if (prev.firstNames) {
        const next = { ...prev };
        delete next.firstNames;
        return next;
      }
      return prev;
    });
  }, []);

  // Last names change handler
  const handleLastNamesChange = useCallback((val: string) => {
    setLastNames(val);
    setErrors(prev => {
      if (prev.lastNames) {
        const next = { ...prev };
        delete next.lastNames;
        return next;
      }
      return prev;
    });
  }, []);

  // Recognition code change handler
  const handleRecognitionCodeChange = useCallback((val: string) => {
    setRecognitionCode(val.toUpperCase());
    setErrors(prev => {
      if (prev.recognitionCode) {
        const next = { ...prev };
        delete next.recognitionCode;
        return next;
      }
      return prev;
    });
  }, []);

  // Regenerate code handler
  const handleRegenerateCode = useCallback(() => {
    setRecognitionCode(generateRecognitionCode('REC'));
    setErrors(prev => {
      if (prev.recognitionCode) {
        const next = { ...prev };
        delete next.recognitionCode;
        return next;
      }
      return prev;
    });
  }, []);

function getScraperErrorMessage(err: unknown): string {
  const errorMsg = err instanceof Error ? err.message : String(err);
  if (errorMsg.includes('No registrado')) {
    return 'Usuario no registrado en Sistema de Registro.';
  }
  return 'Error al consultar Sistema de Registro.';
}

  // Scraper Lookup
  const handleConsult = useCallback(async () => {
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
      setScraperStatus('error');
      setVerifiedCedula(null);
      setScraperMsg(getScraperErrorMessage(err));
    } finally {
      setIsSearchingScraper(false);
    }
  }, [identity, triggerToast]);

  const validateForm = useCallback((): boolean => {
    const newErrors = validateQuickRecognitionFields({
      recognitionType,
      unit,
      regionId,
      districtId,
      groupId,
      identity,
      scraperStatus,
      verifiedCedula,
      firstNames,
      lastNames,
      recognitionCode
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [recognitionType, unit, regionId, districtId, groupId, identity, scraperStatus, verifiedCedula, firstNames, lastNames, recognitionCode]);

  const handleSubmit = useCallback(async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const result = await executeQuickEmission({
        comment,
        regionId,
        districtId,
        groupId,
        unit,
        recognitionType,
        identity,
        firstNames,
        lastNames,
        birthDate,
        email,
        phone,
        recognitionCode,
        userId: user?.uid,
        availableRecognitionTypes,
        regions,
        districts,
        groups
      });

      setSuccessData(result);
      triggerToast('¡Reconocimiento emitido y descargado exitosamente!', 'success');
    } catch (err) {
      console.error('Error in quick recognition emission:', err);
      triggerToast('Ocurrió un error al emitir el reconocimiento.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    validateForm,
    comment,
    regionId,
    districtId,
    groupId,
    unit,
    recognitionType,
    identity,
    firstNames,
    lastNames,
    birthDate,
    email,
    phone,
    recognitionCode,
    user,
    availableRecognitionTypes,
    regions,
    districts,
    groups,
    triggerToast
  ]);

  const handleEmitAnother = useCallback(() => {
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
  }, []);

  return {
    // Hierarchy & Types
    regions,
    districts,
    groups,
    recognitionTypes,
    availableRecognitionTypes,
    filteredDistricts,
    filteredGroups,
    loadingHierarchy,

    // Form State
    recognitionType,
    setRecognitionType,
    regionId,
    setRegionId,
    districtId,
    setDistrictId,
    groupId,
    setGroupId,
    comment,
    setComment,
    unit,
    setUnit,
    identity,
    setIdentity,
    firstNames,
    setFirstNames,
    lastNames,
    setLastNames,
    recognitionCode,
    setRecognitionCode,
    birthDate,
    setBirthDate,
    email,
    setEmail,
    phone,
    setPhone,

    // Scraper State
    isSearchingScraper,
    scraperStatus,
    scraperMsg,
    verifiedCedula,

    // Validation & Submission
    errors,
    setErrors,
    isSubmitting,
    toastMessage,
    showToast,
    toastType,
    triggerToast,

    // Success State
    successData,
    setSuccessData,

    // Handlers
    handleRegionChange,
    handleDistrictChange,
    handleGroupChange,
    handleRecognitionTypeChange,
    handleUnitChange,
    handleIdentityChange,
    handleFirstNamesChange,
    handleLastNamesChange,
    handleRecognitionCodeChange,
    handleRegenerateCode,
    handleConsult,
    validateForm,
    handleSubmit,
    handleEmitAnother
  };
}
