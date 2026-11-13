import { createBatch, createMember, isScraperSessionError } from '../api';
import {
  Batch,
  ScoutMember,
  Region,
  District,
  ScoutGroup,
  ScoutUnit
} from '../types';
import {
  downloadSingleCertificatePdf,
  RecognitionType
} from '../../recognitions';

export interface SuccessEmissionData {
  batch: Batch;
  member: ScoutMember;
  recognitionName: string;
}

export interface QuickEmissionExecutionParams {
  comment: string;
  regionId: string;
  districtId: string;
  groupId: string;
  unit: ScoutUnit;
  memberType: 'young' | 'adult';
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

export function sanitizeQuickCedula(val: string): string {
  return val.replace(/[^0-9vV-]/g, '');
}

export function getScraperErrorMessage(err: unknown): string {
  if (isScraperSessionError(err)) {
    if (err.reason === 'SCRAPER_NOT_CONFIGURED') {
      return 'No hay una sesión de Impeesa configurada en Ajustes del Scraper.';
    }
    if (err.reason === 'SCRAPER_SESSION_EXPIRED') {
      return 'Tu sesión de Impeesa expiró. Reconéctate en Ajustes del Scraper.';
    }
    return 'Debes iniciar sesión en Chil para usar el scraper.';
  }
  const errorMsg = err instanceof Error ? err.message : String(err);
  if (errorMsg.includes('No registrado')) {
    return 'Usuario no registrado en Sistema de Registro.';
  }
  if (
    errorMsg.includes('SCRAPER_NOT_CONFIGURED') ||
    errorMsg.toLowerCase().includes('no hay una sesión de impeesa')
  ) {
    return 'No hay una sesión de Impeesa configurada en Ajustes del Scraper.';
  }
  if (
    errorMsg.includes('failed-precondition') ||
    errorMsg.includes('SCRAPER_SESSION_EXPIRED') ||
    errorMsg.toLowerCase().includes('expir')
  ) {
    return 'Tu sesión de Impeesa expiró. Reconéctate en Ajustes del Scraper.';
  }
  if (
    errorMsg.includes('Credenciales') ||
    errorMsg.includes('unauthenticated') ||
    errorMsg.includes('UNAUTHENTICATED')
  ) {
    return 'Credenciales de scraper incorrectas o sesión expirada.';
  }
  if (errorMsg.toLowerCase().includes('internal')) {
    return 'Error del servicio de verificación. Verifique las credenciales del scraper.';
  }
  return 'Error al consultar Sistema de Registro.';
}

export function resolveQuickRecognitionType(
  recognitionType: string,
  availableRecognitionTypes: (RecognitionType | { id: string; name: string })[]
): RecognitionType {
  const found = availableRecognitionTypes.find((r) => r.id === recognitionType);
  return {
    id: found?.id ?? recognitionType,
    name: found?.name ?? recognitionType,
    created_at:
      found && 'created_at' in found && found.created_at
        ? (found as RecognitionType).created_at
        : new Date().toISOString(),
    ...(found && 'template' in found && found.template
      ? { template: (found as RecognitionType).template }
      : {})
  };
}

export async function executeQuickEmission(
  params: QuickEmissionExecutionParams
): Promise<SuccessEmissionData> {
  const {
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
    userId,
    availableRecognitionTypes,
    regions,
    districts,
    groups
  } = params;

  const isNoScout = unit === 'no_scout';
  const parsedRegion = Number(regionId);
  const parsedDistrict = Number(districtId);
  const parsedGroup = Number(groupId);

  const finalRegionId =
    isNoScout && (!regionId || regionId === '')
      ? 0
      : Number.isNaN(parsedRegion)
        ? 0
        : parsedRegion;
  const finalDistrictId =
    isNoScout && (!districtId || districtId === '')
      ? 0
      : Number.isNaN(parsedDistrict)
        ? 0
        : parsedDistrict;
  const finalGroupId =
    isNoScout && (!groupId || groupId === '')
      ? 0
      : Number.isNaN(parsedGroup)
        ? 0
        : parsedGroup;

  // 1. Create single-member Batch
  const createdBatch = await createBatch(
    {
      comment: comment.trim() || undefined,
      region_id: finalRegionId,
      district_id: finalDistrictId,
      group_id: finalGroupId,
      unit_scope: unit,
      recognition_type: recognitionType,
      user_id: userId
    },
    userId
  );

  // 2. Create Member
  const createdMember = await createMember(
    {
      identity: identity.trim(),
      first_names: firstNames.trim(),
      last_names: lastNames.trim(),
      birth_date: birthDate || '2000-01-01',
      ...(email ? { email: email.trim() } : {}),
      ...(phone ? { phone: phone.trim() } : {}),
      unit,
      member_type: memberType,
      status: 'active',
      verified_in_registry: unit !== 'no_scout',
      batch_id: createdBatch.id,
      recognition_code: recognitionCode.trim(),
      ...(userId ? { user_id: userId } : {})
    },
    userId
  );

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
