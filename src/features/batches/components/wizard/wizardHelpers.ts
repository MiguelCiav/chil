import {
  createMember,
  updateMember,
  deleteMember,
  getMembersByBatchId,
  assignBatchRecognitionCodes,
  ScraperMemberDetails
} from '../../api';
import {
  ScoutMember,
  MemberVerificationResult,
  BatchUnitScope,
  ScoutUnit
} from '../../types';
import { inferBatchMemberUnits } from '../../utils/unitInference';
import { splitFullName } from '../../utils/nameHelper';
import { matchHierarchy, classifyScoutUnitAndType } from '../../utils/hierarchyMatcher';

export { splitFullName, matchHierarchy, classifyScoutUnitAndType };

export function parseCedulasFromText(text?: string): string[] {
  if (!text) return [];
  return text
    .split(/[\n\r,;\s]+/)
    .map((token) => token.replace(/[^0-9]/g, ''))
    .filter((digits) => digits.length > 0)
    .filter((digits, idx, arr) => arr.indexOf(digits) === idx);
}

export function getStepCircleClasses(currentStep: number, itemStep: number): string {
  if (currentStep === itemStep) {
    return 'bg-secondary border-primary text-primary ring-4 ring-primary/20 scale-105';
  }
  if (currentStep > itemStep) {
    return 'bg-emerald-50 border-emerald-300 text-emerald-700';
  }
  return 'bg-white border-gray-300 text-gray-400 hover:border-primary/50';
}

export function handleScrapeErrorResult(
  err: unknown
): { name: string; status: 'No registrado' | 'Error de red'; isUnregistered: boolean } {
  const errStr = err instanceof Error ? err.message : String(err);
  const isUnregistered = errStr.includes('No registrado');
  return {
    name: isUnregistered ? 'Usuario No Registrado' : 'Error de conexión',
    status: isUnregistered ? 'No registrado' : 'Error de red',
    isUnregistered
  };
}

export function getInitialMemberUnit(
  explicitUnit: ScoutUnit | undefined,
  batchUnitScope: BatchUnitScope,
  type: 'young' | 'adult'
): ScoutUnit {
  if (explicitUnit) return explicitUnit;
  if (batchUnitScope !== 'mixed') return batchUnitScope as ScoutUnit;
  return type === 'young' ? 'tropa' : 'institucional';
}

export function upsertVerificationItem(
  list: MemberVerificationResult[],
  item: MemberVerificationResult
): MemberVerificationResult[] {
  const idx = list.findIndex((existing) => existing.cedula === item.cedula);
  if (idx > -1) {
    const copy = [...list];
    copy[idx] = item;
    return copy;
  }
  return [...list, item];
}

export function parseCedulaEntries(youngsText: string, adultsText: string) {
  const youngs = youngsText
    .split('\n')
    .map((c) => c.trim().replace(/[^0-9]/g, ''))
    .filter(Boolean);
  const adults = adultsText
    .split('\n')
    .map((c) => c.trim().replace(/[^0-9]/g, ''))
    .filter(Boolean);
  const allCedulas = [
    ...youngs.map((c) => ({ cedula: c, type: 'young' as const })),
    ...adults.map((c) => ({ cedula: c, type: 'adult' as const }))
  ];
  const cedulaSet = new Set([...youngs, ...adults]);
  return { youngs, adults, allCedulas, cedulaSet };
}

export interface InitialMemberHierarchy {
  region_id?: number;
  district_id?: number;
  group_id?: number;
}

export async function saveNoScoutMemberToDb(
  cedula: string,
  type: 'young' | 'adult' = 'adult',
  batchId: number | null = null,
  userId?: string,
  hierarchy?: InitialMemberHierarchy
): Promise<ScoutMember | null> {
  if (!batchId) return null;
  try {
    return await createMember(
      {
        identity: cedula,
        first_names: 'Colaborador',
        last_names: 'No Scout',
        birth_date: '1990-01-01',
        member_type: type,
        unit: 'no_scout',
        status: 'active',
        verified_in_registry: false,
        batch_id: batchId,
        user_id: userId,
        region_id: hierarchy?.region_id ?? 0,
        district_id: hierarchy?.district_id ?? 0,
        group_id: hierarchy?.group_id ?? 0
      },
      userId
    );
  } catch (dbErr) {
    console.error('Database save failed for no_scout member:', dbErr);
    return null;
  }
}

export async function saveUnregisteredMemberToDb(
  cedula: string,
  type: 'young' | 'adult' = 'young',
  memberUnit: ScoutUnit = 'tropa',
  batchId: number | null = null,
  userId?: string,
  hierarchy?: InitialMemberHierarchy
): Promise<ScoutMember | null> {
  if (!batchId) return null;
  try {
    return await createMember(
      {
        identity: cedula,
        first_names: 'Usuario',
        last_names: 'No Registrado',
        birth_date: '1990-01-01',
        member_type: type,
        unit: memberUnit,
        status: 'pending',
        verified_in_registry: true,
        batch_id: batchId,
        user_id: userId,
        region_id: hierarchy?.region_id ?? 0,
        district_id: hierarchy?.district_id ?? 0,
        group_id: hierarchy?.group_id ?? 0
      },
      userId
    );
  } catch (dbErr) {
    console.error('Database save failed for unregistered member:', dbErr);
    return null;
  }
}

export async function saveScrapedMemberToDb(
  cedula: string,
  res: ScraperMemberDetails,
  type?: 'young' | 'adult',
  memberUnit?: ScoutUnit,
  batchId?: number | null,
  userId?: string,
  hierarchy?: InitialMemberHierarchy
): Promise<ScoutMember | null> {
  if (!batchId) return null;
  try {
    const { first_names, last_names } = splitFullName(res.nombre_completo);
    const isScrapedActive = res.status?.toLowerCase() === 'activo';
    const matched = matchHierarchy(res.region, res.distrito, res.grupo);
    const classified = classifyScoutUnitAndType(res);

    const finalUnit = memberUnit || classified.unit;
    const finalType = type || classified.member_type;
    const finalRegionId =
      matched.region_id ??
      (hierarchy?.region_id && hierarchy.region_id !== 0 ? hierarchy.region_id : 0);
    const finalDistrictId =
      matched.district_id ??
      (hierarchy?.district_id && hierarchy.district_id !== 0 ? hierarchy.district_id : 0);
    const finalGroupId =
      matched.group_id ??
      (hierarchy?.group_id && hierarchy.group_id !== 0 ? hierarchy.group_id : 0);

    return await createMember(
      {
        identity: cedula,
        first_names: first_names || cedula,
        last_names: last_names || '',
        birth_date: res.fecha_nacimiento || '1990-01-01',
        email: res.correo_electronico,
        phone: res.telefono,
        region_id: finalRegionId,
        region_name: matched.region_name,
        district_id: finalDistrictId,
        district_name: matched.district_name,
        group_id: finalGroupId,
        group_name: matched.group_name,
        member_type: finalType,
        unit: finalUnit,
        position_in_group: res.cargo_grupo,
        institutional_position: res.cargo_institucional,
        scout_progression: res.progresion_actual,
        status: isScrapedActive ? 'active' : 'pending',
        is_solvent: isScrapedActive,
        solvent_until: res.solvente_hasta,
        avatar_url: res.avatar_url,
        impeesa_uuid: res.member_uuid,
        admission_date: res.fecha_ingreso,
        promise_date: res.fecha_promesa,
        verified_in_registry: true,
        batch_id: batchId,
        user_id: userId
      },
      userId
    );
  } catch (dbErr) {
    console.error('Database save failed for active/inactive member:', dbErr);
    return null;
  }
}

export async function syncAndFinalizeStep2Members(
  batchId: number,
  youngCedulas: string,
  adultCedulas: string,
  batchUnitScope: BatchUnitScope
): Promise<ScoutMember[]> {
  const { cedulaSet } = parseCedulaEntries(youngCedulas, adultCedulas);
  const dbMembers = await getMembersByBatchId(batchId);

  const deletePromises = dbMembers
    .filter((m) => !cedulaSet.has(m.identity))
    .map((m) => deleteMember(m.recognition_code || m.identity, m.identity, batchId));
  await Promise.all(deletePromises);

  const members = await getMembersByBatchId(batchId);
  const normalizedMembers = inferBatchMemberUnits(members, batchUnitScope);
  await Promise.all(normalizedMembers.map((m) => updateMember(m)));
  return assignBatchRecognitionCodes(normalizedMembers, 'auto');
}
