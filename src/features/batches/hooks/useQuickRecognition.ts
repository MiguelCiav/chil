import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  getHierarchyData,
  getMemberStatus,
  RECOGNITION_TYPES
} from '../api';
import {
  Region,
  District,
  ScoutGroup,
  ScoutUnit
} from '../types';
import { generateRecognitionCode } from '../utils/codeGenerator';
import { splitFullName } from '../utils/nameHelper';
import { calculateAge } from '../utils/unitInference';
import {
  getAllRecognitionTypes,
  RecognitionType
} from '../../recognitions';
import { useAuth } from '../../auth';
import {
  validateQuickRecognitionFields,
  QuickRecognitionValidationParams,
  quickRecognitionSchema
} from './quickRecognitionSchema';
import {
  SuccessEmissionData,
  QuickEmissionExecutionParams,
  sanitizeQuickCedula,
  getScraperErrorMessage,
  resolveQuickRecognitionType,
  executeQuickEmission
} from './quickRecognitionHelpers';

export {
  validateQuickRecognitionFields,
  quickRecognitionSchema,
  getScraperErrorMessage,
  resolveQuickRecognitionType,
  executeQuickEmission
};
export type {
  SuccessEmissionData,
  QuickRecognitionValidationParams,
  QuickEmissionExecutionParams
};

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
  const [memberType, setMemberType] = useState<'young' | 'adult'>('young');
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
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Success State
  const [successData, setSuccessData] = useState<SuccessEmissionData | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const triggerToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current !== null) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(msg);
    setToastType(type);
    setShowToast(true);
    toastTimerRef.current = setTimeout(() => {
      setShowToast(false);
      toastTimerRef.current = null;
    }, 4000);
  }, []);

  const clearErrorFields = useCallback((fields: string[]) => {
    setErrors((prev) => {
      const hasAny = fields.some((field) => field in prev);
      if (!hasAny) return prev;
      const next = { ...prev };
      for (const field of fields) {
        delete next[field];
      }
      return next;
    });
  }, []);

  // Fetch initial hierarchy and recognition types
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getHierarchyData(),
      getAllRecognitionTypes(user?.uid)
    ])
      .then(([hierarchy, recTypes]) => {
        if (!isMounted) return;
        setRegions(hierarchy.regions ?? []);
        setDistricts(hierarchy.districts ?? []);
        setGroups(hierarchy.groups ?? []);
        setRecognitionTypes(recTypes ?? []);
      })
      .catch((err) => {
        console.error('Error loading quick recognition metadata:', err);
      })
      .finally(() => {
        if (isMounted) {
          setLoadingHierarchy(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  // Filtered dropdown lists
  const filteredDistricts = useMemo(() => {
    if (!regionId || regionId === '0') return [];
    const dists = districts.filter((d) => d.id !== 0 && d.region_id === Number(regionId));
    return [{ id: 0, name: 'No aplica', region_id: Number(regionId) }, ...dists];
  }, [districts, regionId]);

  const filteredGroups = useMemo(() => {
    if (!districtId || districtId === '0') return [];
    const grps = groups.filter((g) => g.id !== 0 && g.district_id === Number(districtId));
    return [{ id: 0, name: 'No aplica', district_id: Number(districtId) }, ...grps];
  }, [groups, districtId]);

  const availableRecognitionTypes = recognitionTypes.length > 0 ? recognitionTypes : RECOGNITION_TYPES;

  // Region change cascading handler
  const handleRegionChange = useCallback(
    (val: string) => {
      setRegionId(val);
      if (val === '0') {
        setDistrictId('0');
        setGroupId('0');
      } else {
        setDistrictId('');
        setGroupId('');
      }
      clearErrorFields(['regionId', 'districtId', 'groupId']);
    },
    [clearErrorFields]
  );

  // District change cascading handler
  const handleDistrictChange = useCallback(
    (val: string) => {
      setDistrictId(val);
      if (val === '0') {
        setGroupId('0');
      } else {
        setGroupId('');
      }
      clearErrorFields(['districtId', 'groupId']);
    },
    [clearErrorFields]
  );

  // Group change handler
  const handleGroupChange = useCallback(
    (val: string) => {
      setGroupId(val);
      clearErrorFields(['groupId']);
    },
    [clearErrorFields]
  );

  // Recognition type change handler
  const handleRecognitionTypeChange = useCallback(
    (val: string) => {
      setRecognitionType(val);
      clearErrorFields(['recognitionType']);
    },
    [clearErrorFields]
  );

  // Unit change handler
  const handleUnitChange = useCallback((newUnit: ScoutUnit) => {
    setUnit(newUnit);
    if (newUnit === 'institucional' || newUnit === 'no_scout') {
      setMemberType('adult');
    } else {
      setMemberType('young');
    }
    setScraperStatus('idle');
    setScraperMsg('');
    setVerifiedCedula(null);
  }, []);

  // Member type change handler
  const handleMemberTypeChange = useCallback((newType: 'young' | 'adult') => {
    setMemberType(newType);
  }, []);

  // Identity change handler
  const handleIdentityChange = useCallback(
    (val: string) => {
      const sanitized = sanitizeQuickCedula(val);
      setIdentity(sanitized);
      setVerifiedCedula(null);
      setScraperStatus('idle');
      setScraperMsg('');
      clearErrorFields(['identity']);
    },
    [clearErrorFields]
  );

  // First names change handler
  const handleFirstNamesChange = useCallback(
    (val: string) => {
      setFirstNames(val);
      clearErrorFields(['firstNames']);
    },
    [clearErrorFields]
  );

  // Last names change handler
  const handleLastNamesChange = useCallback(
    (val: string) => {
      setLastNames(val);
      clearErrorFields(['lastNames']);
    },
    [clearErrorFields]
  );

  // Recognition code change handler
  const handleRecognitionCodeChange = useCallback(
    (val: string) => {
      setRecognitionCode(val.toUpperCase());
      clearErrorFields(['recognitionCode']);
    },
    [clearErrorFields]
  );

  // Regenerate code handler
  const handleRegenerateCode = useCallback(() => {
    setRecognitionCode(generateRecognitionCode('REC'));
    clearErrorFields(['recognitionCode']);
  }, [clearErrorFields]);

  // Scraper Lookup
  const handleConsult = useCallback(async () => {
    const cleanCedula = identity.trim();
    if (!cleanCedula) {
      setErrors((prev) => ({ ...prev, identity: 'Ingrese una cédula para consultar' }));
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
        if (details.fecha_nacimiento) {
          setBirthDate(details.fecha_nacimiento);
          const age = calculateAge(details.fecha_nacimiento);
          if (age !== null) {
            setMemberType(age >= 21 ? 'adult' : 'young');
          }
        }
        if (details.correo_electronico) setEmail(details.correo_electronico);
        if (details.telefono) setPhone(details.telefono);

        setScraperStatus('success');
        setVerifiedCedula(cleanCedula);
        setScraperMsg(`✓ Miembro encontrado: ${details.nombre_completo}`);
        clearErrorFields(['identity', 'firstNames', 'lastNames']);
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
  }, [identity, clearErrorFields, triggerToast]);

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
  }, [
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
  ]);

  const handleSubmit = useCallback(
    async (e: React.SyntheticEvent<HTMLFormElement>) => {
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
          memberType,
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
    },
    [
      validateForm,
      comment,
      regionId,
      districtId,
      groupId,
      unit,
      memberType,
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
    ]
  );

  const handleEmitAnother = useCallback(() => {
    setSuccessData(null);
    setUnit('manada');
    setMemberType('young');
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
    memberType,
    setMemberType,
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
    handleMemberTypeChange,
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
