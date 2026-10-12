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

export function splitFullName(name: string): { first_names: string; last_names: string } {
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
  type: 'young' | 'adult',
  batchId: number | null,
  userId?: string,
  hierarchy?: InitialMemberHierarchy
): Promise<void> {
  if (!batchId) return;
  try {
    await createMember(
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
        region_id: hierarchy?.region_id && hierarchy.region_id !== 0 ? hierarchy.region_id : undefined,
        district_id: hierarchy?.district_id && hierarchy.district_id !== 0 ? hierarchy.district_id : undefined,
        group_id: hierarchy?.group_id && hierarchy.group_id !== 0 ? hierarchy.group_id : undefined
      },
      userId
    );
  } catch (dbErr) {
    console.error('Database save failed for no_scout member:', dbErr);
  }
}

export async function saveUnregisteredMemberToDb(
  cedula: string,
  type: 'young' | 'adult',
  memberUnit: ScoutUnit,
  batchId: number | null,
  userId?: string,
  hierarchy?: InitialMemberHierarchy
): Promise<void> {
  if (!batchId) return;
  try {
    await createMember(
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
        region_id: hierarchy?.region_id && hierarchy.region_id !== 0 ? hierarchy.region_id : undefined,
        district_id: hierarchy?.district_id && hierarchy.district_id !== 0 ? hierarchy.district_id : undefined,
        group_id: hierarchy?.group_id && hierarchy.group_id !== 0 ? hierarchy.group_id : undefined
      },
      userId
    );
  } catch (dbErr) {
    console.error('Database save failed for unregistered member:', dbErr);
  }
}

export async function saveScrapedMemberToDb(
  cedula: string,
  res: ScraperMemberDetails,
  type: 'young' | 'adult',
  memberUnit: ScoutUnit,
  batchId: number | null,
  userId?: string,
  hierarchy?: InitialMemberHierarchy
): Promise<void> {
  if (!batchId) return;
  try {
    const { first_names, last_names } = splitFullName(res.nombre_completo);
    const isScrapedActive = res.status?.toLowerCase() === 'activo';
    await createMember(
      {
        identity: cedula,
        first_names,
        last_names,
        birth_date: res.fecha_nacimiento || '1990-01-01',
        email: res.correo_electronico,
        phone: res.telefono,
        member_type: type,
        unit: memberUnit,
        status: isScrapedActive ? 'active' : 'pending',
        verified_in_registry: true,
        batch_id: batchId,
        user_id: userId,
        region_id: hierarchy?.region_id && hierarchy.region_id !== 0 ? hierarchy.region_id : undefined,
        district_id: hierarchy?.district_id && hierarchy.district_id !== 0 ? hierarchy.district_id : undefined,
        group_id: hierarchy?.group_id && hierarchy.group_id !== 0 ? hierarchy.group_id : undefined
      },
      userId
    );
  } catch (dbErr) {
    console.error('Database save failed for active/inactive member:', dbErr);
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
    .map((m) => deleteMember(m.recognition_code || m.identity, m.identity));
  await Promise.all(deletePromises);

  const members = await getMembersByBatchId(batchId);
  const normalizedMembers = inferBatchMemberUnits(members, batchUnitScope);
  await Promise.all(normalizedMembers.map((m) => updateMember(m)));
  return assignBatchRecognitionCodes(normalizedMembers, 'auto');
}
