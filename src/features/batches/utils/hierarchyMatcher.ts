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

  // 1. Coincidencia de Región
  let matchedRegion = normRegion
    ? hierarchyData.regions.find(
        (r) => r.id !== 0 && normalizeScoutName(r.name) === normRegion
      )
    : undefined;

  if (!matchedRegion && normRegion) {
    matchedRegion = hierarchyData.regions.find(
      (r) =>
        r.id !== 0 &&
        (normalizeScoutName(r.name).includes(normRegion) ||
          normRegion.includes(normalizeScoutName(r.name)))
    );
  }

  // 2. Coincidencia de Distrito (prioriza la región encontrada)
  let matchedDistrict = null;
  if (matchedRegion && normDistrict) {
    matchedDistrict = hierarchyData.districts.find(
      (d) =>
        d.id !== 0 &&
        d.region_id === matchedRegion!.id &&
        normalizeScoutName(d.name) === normDistrict
    );
    if (!matchedDistrict) {
      matchedDistrict = hierarchyData.districts.find(
        (d) =>
          d.id !== 0 &&
          d.region_id === matchedRegion!.id &&
          (normalizeScoutName(d.name).includes(normDistrict) ||
            normDistrict.includes(normalizeScoutName(d.name)))
      );
    }
  }
  if (!matchedDistrict && normDistrict) {
    matchedDistrict = hierarchyData.districts.find(
      (d) => d.id !== 0 && normalizeScoutName(d.name) === normDistrict
    );
    if (!matchedDistrict) {
      matchedDistrict = hierarchyData.districts.find(
        (d) =>
          d.id !== 0 &&
          (normalizeScoutName(d.name).includes(normDistrict) ||
            normDistrict.includes(normalizeScoutName(d.name)))
      );
    }
    if (matchedDistrict && !matchedRegion) {
      matchedRegion = hierarchyData.regions.find((r) => r.id === matchedDistrict!.region_id);
    }
  }

  // 3. Coincidencia de Grupo Scout
  let matchedGroup = null;
  if (matchedDistrict && normGroup) {
    // 3.1 Coincidencia exacta dentro del distrito
    matchedGroup = hierarchyData.groups.find(
      (g) =>
        g.id !== 0 &&
        g.district_id === matchedDistrict!.id &&
        normalizeScoutName(g.name) === normGroup
    );
    // 3.2 Coincidencia parcial/subcadena
    if (!matchedGroup) {
      matchedGroup = hierarchyData.groups.find(
        (g) =>
          g.id !== 0 &&
          g.district_id === matchedDistrict!.id &&
          (normalizeScoutName(g.name).includes(normGroup) ||
            normGroup.includes(normalizeScoutName(g.name)))
      );
    }
  } else if (normGroup) {
    // 3.3 Búsqueda global de grupo si no hubo distrito previo
    matchedGroup = hierarchyData.groups.find(
      (g) => g.id !== 0 && normalizeScoutName(g.name) === normGroup
    );
    if (!matchedGroup) {
      matchedGroup = hierarchyData.groups.find(
        (g) =>
          g.id !== 0 &&
          (normalizeScoutName(g.name).includes(normGroup) ||
            normGroup.includes(normalizeScoutName(g.name)))
      );
    }
    if (matchedGroup) {
      if (!matchedDistrict) {
        matchedDistrict = hierarchyData.districts.find((d) => d.id === matchedGroup!.district_id);
      }
      if (matchedDistrict && !matchedRegion) {
        matchedRegion = hierarchyData.regions.find((r) => r.id === matchedDistrict!.region_id);
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

/**
 * Calcula la edad en años a partir de una fecha en formato YYYY-MM-DD o DD/MM/YYYY
 */
function calculateAgeFromBirthDate(birthDateStr?: string): number | null {
  if (!birthDateStr) return null;
  const isoMatch = birthDateStr.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const birthDate = new Date(year, month, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  }

  const dmyMatch = birthDateStr.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const birthDate = new Date(year, month, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  }

  return null;
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
  let edad = scraped.edad ?? null;
  if (edad === null && scraped.fecha_nacimiento) {
    edad = calculateAgeFromBirthDate(scraped.fecha_nacimiento);
  }

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
  const isAdultRole =
    normCargo.includes('adulto') ||
    normCargo.includes('dirigente') ||
    normCargo.includes('jefe') ||
    normCargo.includes('colaborador') ||
    normCargo.includes('cooperador') ||
    normCargo.includes('asistente') ||
    normCargo.includes('scouter') ||
    normCargoInst.includes('nacional') ||
    normCargoInst.includes('distrital') ||
    normCargoInst.includes('regional') ||
    normCargoInst.includes('comisionado') ||
    normTipo.includes('institucional') ||
    normTipo.includes('distrito') ||
    normTipo.includes('nacional') ||
    normTipo.includes('adulto');

  const isAdultAge = edad !== null && edad >= 21;
  const isAdult = isAdultRole || isAdultAge;

  // 2. Mapeo de Unidad Scout
  // Si la persona pertenece explícitamente a una rama juvenil (incluso como adulto dirigente de rama),
  // se respeta esa unidad (Manada, Tropa, Caminantes/Comunidad, Clan).
  let unit: ScoutUnit = 'institucional';

  if (
    normUnit.includes('manada') ||
    normUnit.includes('lobato') ||
    normUnit.includes('lobezna') ||
    (!isAdult && edad !== null && edad >= 7 && edad < 11)
  ) {
    unit = 'manada';
  } else if (
    normUnit.includes('tropa') ||
    (!isAdult && edad !== null && edad >= 11 && edad < 16)
  ) {
    unit = 'tropa';
  } else if (
    normUnit.includes('comunidad') ||
    normUnit.includes('caminante') ||
    (!isAdult && edad !== null && edad >= 16 && edad < 18)
  ) {
    unit = 'caminantes';
  } else if (
    normUnit.includes('clan') ||
    normUnit.includes('rover') ||
    (!isAdult && edad !== null && edad >= 18 && edad < 21)
  ) {
    unit = 'clan';
  } else if (normUnit.includes('conductor') || isAdult) {
    unit = 'institucional';
  }

  return {
    unit,
    member_type: isAdult ? 'adult' : 'young'
  };
}
