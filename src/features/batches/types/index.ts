export type ScoutUnit = 'manada' | 'tropa' | 'caminantes' | 'clan' | 'institucional' | 'no_scout';
export type BatchUnitScope = 'mixed' | ScoutUnit;

export const SCOUT_UNITS: Record<ScoutUnit, { label: string; badgeClass: string }> = {
  manada: {
    label: 'Manada',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  tropa: {
    label: 'Tropa',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  caminantes: {
    label: 'Caminantes',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  clan: {
    label: 'Clan',
    badgeClass: 'bg-red-50 text-red-700 border-red-200'
  },
  institucional: {
    label: 'Institucional',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  no_scout: {
    label: 'No scout',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300'
  }
};

export function getUnitLabel(unit?: ScoutUnit): string {
  if (!unit) return '-';
  return SCOUT_UNITS[unit]?.label || unit;
}

export function getUnitBadge(unit?: ScoutUnit): { label: string; badgeClass: string } {
  if (unit && SCOUT_UNITS[unit]) {
    return SCOUT_UNITS[unit];
  }
  return {
    label: unit || '-',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300'
  };
}

export interface Batch {
  id: number;
  comment?: string;
  region_id: number;
  district_id: number;
  group_id: number;
  unit_scope?: BatchUnitScope;
  recognition_type?: string;
  recognition_duration?: string;
  created_at: string;
  user_id?: string;
}

export type MemberStatus = 'active' | 'pending' | 'exceptional';

export interface ScoutMember {
  identity: string;
  first_names: string;
  last_names: string;
  birth_date: string;
  email?: string;
  phone?: string;
  group_id?: number;
  unit_id?: number;
  unit?: ScoutUnit;
  member_type: 'young' | 'adult'; // "young" (Joven) or "adult" (Adulto)
  status: MemberStatus;   // "active" (Registro válido), "pending" (No registrado), or "exceptional" (Emisión excepcional)
  batch_id?: number;
  recognition_code?: string;
  user_id?: string;
  exceptional_reason?: string;
  verified_in_registry?: boolean;
}

export interface Region {
  id: number;
  name: string;
}

export interface District {
  id: number;
  name: string;
  region_id: number;
}

export interface ScoutGroup {
  id: number;
  name: string;
  district_id: number;
}

export interface MemberVerificationResult {
  cedula: string;
  name?: string;
  status: 'Consultando...' | 'Registro válido' | 'No registrado' | 'Error de red';
  type: 'young' | 'adult';
  unit?: ScoutUnit;
  details?: {
    nombre_completo: string;
    status: string;
    telefono: string;
    correo_electronico: string;
    fecha_nacimiento: string;
  };
}

export interface BatchCreationParams {
  comment?: string;
  region_id: number;
  district_id: number;
  group_id: number;
  unit_scope?: BatchUnitScope;
  recognition_type: string;
  recognition_duration?: string;
  user_id?: string;
}

export interface ActiveFilterChip {
  id: string;
  label: string;
  value: string;
  type: 'date' | 'region' | 'district' | 'group' | 'unit' | 'recognition';
}

