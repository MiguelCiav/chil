import hierarchyData from '../../../data/hierarchy.json';
import { ScoutUnit } from '../types';

export interface MatchedHierarchy {
  region_id?: number;
  region_name?: string;
  district_id?: number;
  district_name?: string;
  group_id?: number;
  group_name?: string;
}

/**
 * Normaliza nombres eliminando tildes, signos de puntuación y espacios extras.
 */
export function normalizeScoutName(str?: string): string {
  if (!str) return '';
  return str
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos/diacríticos
    .replace(/[^\w\s]/g, ' ')       // Elimina caracteres especiales y signos
    .replace(/\s+/g, ' ')          // Colapsa espacios repetidos
    .trim();
}

interface CanonicalHierarchyEntity {
  id: number;
  name: string;
  uuid?: string;
}

function findMatchingEntity<T extends CanonicalHierarchyEntity>(
  items: readonly T[],
  rawInput: string | undefined,
  normInput: string,
  scopePredicate?: (item: T) => boolean
): T | undefined {
  if (!rawInput) return undefined;
  const isCandidate = (item: T) => item.id !== 0 && (!scopePredicate || scopePredicate(item));

  const exactMatch = items.find(
    (item) =>
      isCandidate(item) &&
      (item.uuid === rawInput || (Boolean(normInput) && normalizeScoutName(item.name) === normInput))
  );
  if (exactMatch || !normInput) {
    return exactMatch;
  }

  return items.find((item) => {
    if (!isCandidate(item)) return false;
    const normItemName = normalizeScoutName(item.name);
    return normItemName.includes(normInput) || normInput.includes(normItemName);
  });
}

/**
 * Mapea nombres extraídos de Impeesa a IDs y nombres canónicos de hierarchy.json
 */
export function matchHierarchy(
  regionStr?: string,
  districtStr?: string,
  groupStr?: string
): MatchedHierarchy {
  const normRegion = normalizeScoutName(regionStr);
  const normDistrict = normalizeScoutName(districtStr);
  const normGroup = normalizeScoutName(groupStr);

  // 1. Coincidencia de Región (UUID o Nombre)
  let matchedRegion = findMatchingEntity(hierarchyData.regions, regionStr, normRegion);

  // 2. Coincidencia de Distrito (prioriza la región encontrada, soporta UUID o Nombre)
  let matchedDistrict = matchedRegion
    ? findMatchingEntity(
        hierarchyData.districts,
        districtStr,
        normDistrict,
        (d) => d.region_id === matchedRegion!.id
      )
    : undefined;

  if (!matchedDistrict) {
    matchedDistrict = findMatchingEntity(hierarchyData.districts, districtStr, normDistrict);
    if (matchedDistrict) {
      matchedRegion ??= hierarchyData.regions.find((r) => r.id === matchedDistrict!.region_id);
    }
  }

  // 3. Coincidencia de Grupo Scout (UUID o Nombre)
  let matchedGroup: (typeof hierarchyData.groups)[number] | undefined;
  if (matchedDistrict) {
    matchedGroup = findMatchingEntity(
      hierarchyData.groups,
      groupStr,
      normGroup,
      (g) => g.district_id === matchedDistrict!.id
    );
  } else if (groupStr) {
    matchedGroup = findMatchingEntity(hierarchyData.groups, groupStr, normGroup);
    if (matchedGroup) {
      matchedDistrict ??= hierarchyData.districts.find((d) => d.id === matchedGroup!.district_id);
      if (matchedDistrict) {
        matchedRegion ??= hierarchyData.regions.find((r) => r.id === matchedDistrict!.region_id);
      }
    }
  }

  return {
    region_id: matchedRegion?.id,
    region_name: matchedRegion?.name || regionStr,
    district_id: matchedDistrict?.id,
    district_name: matchedDistrict?.name || districtStr,
    group_id: matchedGroup?.id,
    group_name: matchedGroup?.name || groupStr
  };
}

function computeYearsSince(year: number, monthIndex: number, day: number): number | null {
  const birthDate = new Date(year, monthIndex, day);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

/**
 * Calcula la edad en años a partir de una fecha en formato YYYY-MM-DD o DD/MM/YYYY
 */
function calculateAgeFromBirthDate(birthDateStr?: string): number | null {
  if (!birthDateStr) return null;
  const isoMatch = /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/.exec(birthDateStr);
  if (isoMatch) {
    const year = Number.parseInt(isoMatch[1], 10);
    const month = Number.parseInt(isoMatch[2], 10) - 1;
    const day = Number.parseInt(isoMatch[3], 10);
    return computeYearsSince(year, month, day);
  }

  const dmyMatch = /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(birthDateStr);
  if (dmyMatch) {
    const day = Number.parseInt(dmyMatch[1], 10);
    const month = Number.parseInt(dmyMatch[2], 10) - 1;
    const year = Number.parseInt(dmyMatch[3], 10);
    return computeYearsSince(year, month, day);
  }

  return null;
}

const ADULT_CARGO_KEYWORDS = [
  'adulto',
  'dirigente',
  'jefe',
  'colaborador',
  'cooperador',
  'asistente',
  'scouter'
] as const;

const ADULT_INSTITUTIONAL_KEYWORDS = [
  'nacional',
  'distrital',
  'regional',
  'comisionado'
] as const;

const ADULT_MEMBER_TYPE_KEYWORDS = [
  'institucional',
  'distrito',
  'nacional',
  'adulto'
] as const;

function hasAdultRoleKeyword(
  normCargo: string,
  normCargoInst: string,
  normTipo: string
): boolean {
  return (
    ADULT_CARGO_KEYWORDS.some((kw) => normCargo.includes(kw)) ||
    ADULT_INSTITUTIONAL_KEYWORDS.some((kw) => normCargoInst.includes(kw)) ||
    ADULT_MEMBER_TYPE_KEYWORDS.some((kw) => normTipo.includes(kw))
  );
}

function isInYouthAgeBand(
  isAdult: boolean,
  edad: number | null,
  minInclusive: number,
  maxExclusive: number
): boolean {
  return !isAdult && edad !== null && edad >= minInclusive && edad < maxExclusive;
}

function resolveScoutBranchUnit(
  normUnit: string,
  isAdult: boolean,
  edad: number | null
): ScoutUnit {
  if (
    normUnit.includes('manada') ||
    normUnit.includes('lobato') ||
    normUnit.includes('lobezna') ||
    isInYouthAgeBand(isAdult, edad, 7, 11)
  ) {
    return 'manada';
  }
  if (normUnit.includes('tropa') || isInYouthAgeBand(isAdult, edad, 11, 16)) {
    return 'tropa';
  }
  if (
    normUnit.includes('comunidad') ||
    normUnit.includes('caminante') ||
    isInYouthAgeBand(isAdult, edad, 16, 18)
  ) {
    return 'caminantes';
  }
  if (
    normUnit.includes('clan') ||
    normUnit.includes('rover') ||
    isInYouthAgeBand(isAdult, edad, 18, 21)
  ) {
    return 'clan';
  }
  return 'institucional';
}

/**
 * Clasifica la unidad y el tipo de miembro (joven vs adulto) a partir de los datos Impeesa
 */
export function classifyScoutUnitAndType(scraped: {
  unidad?: string;
  cargo_grupo?: string;
  cargo_institucional?: string;
  tipo_miembro?: string;
  edad?: number | null;
  fecha_nacimiento?: string;
}): { unit: ScoutUnit; member_type: 'young' | 'adult' } {
  const edad = scraped.edad ?? calculateAgeFromBirthDate(scraped.fecha_nacimiento);

  const normUnit = (scraped.unidad || '').toLowerCase();
  const normCargo = (scraped.cargo_grupo || '').toLowerCase();
  const normCargoInst = (scraped.cargo_institucional || '').toLowerCase();
  const normTipo = (scraped.tipo_miembro || '').toLowerCase();

  // 0. Caso especial No Scout
  if (normUnit.includes('no scout') || normUnit.includes('no_scout')) {
    return {
      unit: 'no_scout',
      member_type: edad !== null && edad < 21 ? 'young' : 'adult'
    };
  }

  // 1. Detección de Adulto
  const isAdultRole = hasAdultRoleKeyword(normCargo, normCargoInst, normTipo);
  const isAdultAge = edad !== null && edad >= 21;
  const isAdult = isAdultRole || isAdultAge;

  // 2. Mapeo de Unidad Scout
  const unit = resolveScoutBranchUnit(normUnit, isAdult, edad);

  return {
    unit,
    member_type: isAdult ? 'adult' : 'young'
  };
}
