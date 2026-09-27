import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  doc
} from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TARGET_USER_ID = 'E61QjuStl0eNLG0glUqMqhY7S2F3';
const TARGET_RECOGNITION_TYPE = 'sct-robots-letales';

const firebaseConfig = {
  apiKey: "AIzaSyCRhmtHPH-W7X1bvWKencfxv7-gOLB5XUE",
  authDomain: "chil-2d600.firebaseapp.com",
  projectId: "chil-2d600",
  storageBucket: "chil-2d600.firebasestorage.app",
  messagingSenderId: "941642326953",
  appId: "1:941642326953:web:3334d5987cb9579d0edab8",
  measurementId: "G-FZ56YEC843"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Load hierarchy data
const hierarchyPath = join(__dirname, '../src/features/batches/api/hierarchy.json');
const hierarchyData = JSON.parse(readFileSync(hierarchyPath, 'utf8'));

function stripAccents(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

// Build index maps
const regionsMap = new Map();
for (const r of hierarchyData.regions) {
  regionsMap.set(stripAccents(r.name), r.id);
}

const districtsMap = new Map();
const districtObjMap = new Map();
for (const d of hierarchyData.districts) {
  districtsMap.set(stripAccents(d.name), d.id);
  districtObjMap.set(d.id, d);
}

const groupsMap = new Map();
const groupObjMap = new Map();
for (const g of hierarchyData.groups) {
  groupsMap.set(stripAccents(g.name), g.id);
  groupObjMap.set(g.id, g);
}

// Known naming variations in CSV to hierarchy mapping
const GROUP_ALIASES = {
  'CALASANZ 38': 48, // SAN JOSE DE CALASANZ 38
  'COMETA 15': 104, // COMETA
  'DON BOSCO XXI': 86, // DON BOSCO 21
  'LA SALLE BARQUISIMETO': 62, // LA SALLE
  'LA SALLE BQTO': 62, // LA SALLE
  'LA SALLE HERMANO JUAN': 62, // LA SALLE
  'ROBERTO RAMIREZ GARBI': 47, // ROBERTO RAMIREZ G.
  'ROBERTO RAMÍREZ GARBI': 47,
  'SAGRADA FAMILIA': 61, // LA SAGRADA FAMILIA
  'SAN BENITO 14': 79 // SAN BENITO XIV
};

const DISTRICT_ALIASES = {
  'GUARENAS - GUATIRE': 36, // GUARENAS GUATIRE
  'GUARENAS-GUATIRE': 36,
  'MANUEL ATANASIO GIRADOT': 5 // MANUEL ATANASIO GIRARDOT
};

const REGION_ALIASES = {
  'CAPITAL': 5, // DISTRITO CAPITAL
  'DTTO. CAPITAL': 5,
  'OSN': 3 // ATENDIDOS POR LA OSN
};

function resolveHierarchy(groupName, districtName, regionName) {
  const normGroup = stripAccents(groupName);
  const normDistrict = stripAccents(districtName);
  const normRegion = stripAccents(regionName);

  let groupId = GROUP_ALIASES[normGroup] ?? groupsMap.get(normGroup) ?? 0;
  let districtId = DISTRICT_ALIASES[normDistrict] ?? districtsMap.get(normDistrict) ?? 0;
  let regionId = REGION_ALIASES[normRegion] ?? regionsMap.get(normRegion) ?? 0;

  // If group is identified, infer missing district or region
  if (groupId > 0) {
    const gObj = groupObjMap.get(groupId);
    if (gObj && gObj.district_id) {
      if (districtId === 0) {
        districtId = gObj.district_id;
      }
      const dObj = districtObjMap.get(gObj.district_id);
      if (dObj && dObj.region_id && regionId === 0) {
        regionId = dObj.region_id;
      }
    }
  }

  // If district is identified, infer missing region
  if (districtId > 0 && regionId === 0) {
    const dObj = districtObjMap.get(districtId);
    if (dObj && dObj.region_id) {
      regionId = dObj.region_id;
    }
  }

  return { groupId, districtId, regionId };
}

function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.some(c => c.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some(c => c.trim().length > 0)) {
      rows.push(currentRow);
    }
  }
  return rows;
}

function cleanSquishedName(name) {
  let cleaned = name.trim();
  const fixes = [
    { from: 'heremyJhosueRodriguez', to: 'Jheremy Jhosue Rodriguez' },
    { from: 'JeremyJosué Piña Rojano', to: 'Jeremy Josué Piña Rojano' },
    { from: 'EliasAntonio Patiño Torres', to: 'Elias Antonio Patiño Torres' },
    { from: 'Santiago José FigueroaWagner', to: 'Santiago José Figueroa Wagner' },
    { from: 'Sebastián Jesús MicelRamos', to: 'Sebastián Jesús Micel Ramos' },
    { from: 'Maria Del PilarBlanco', to: 'Maria Del Pilar Blanco' }
  ];
  for (const fix of fixes) {
    if (cleaned === fix.from) {
      cleaned = fix.to;
    }
  }
  return cleaned;
}

function splitFullName(name) {
  const cleaned = cleanSquishedName(name);
  const parts = cleaned.split(/\s+/).filter(Boolean);
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
      first_names: cleaned,
      last_names: ''
    };
  }
}

function cleanCedula(rawCedula) {
  if (!rawCedula) return 'S/C';
  const trimmed = rawCedula.trim();
  const upper = trimmed.toUpperCase();
  if (
    !trimmed ||
    upper === 'NO_DISPONIBLE' ||
    upper === 'N/A' ||
    upper === 'NONE' ||
    upper === '0000000' ||
    upper === '000000000' ||
    upper === '123456789'
  ) {
    return 'S/C';
  }
  const digitsOnly = trimmed.replace(/[^0-9]/g, '');
  return digitsOnly || 'S/C';
}

function parseUnit(unitStr, memberType) {
  const norm = stripAccents(unitStr).toLowerCase();
  if (norm.includes('manada')) return 'manada';
  if (norm.includes('tropa')) return 'tropa';
  if (norm.includes('caminante')) return 'caminantes';
  if (norm.includes('clan')) return 'clan';
  if (norm.includes('no_scout') || norm.includes('no scout')) return 'no_scout';
  return memberType === 'adult' ? 'institucional' : 'tropa';
}

function parseMemberType(tipoStr, unit) {
  const norm = stripAccents(tipoStr);
  if (norm === 'A' || norm.includes('ADULTO')) return 'adult';
  if (norm === 'J' || norm.includes('JOVEN')) return 'young';
  if (unit === 'institucional') return 'adult';
  return 'young';
}

const MONTH_NAMES_ES = {
  '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
  '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
};

export function loadAllRecords() {
  const records = [];

  // Helper to load 2022-2025 CSVs
  function loadStandardCSV(fileName, sourceYear, codeFilter = () => true) {
    const fileContent = readFileSync(join(__dirname, `../temporal/${fileName}`), 'utf8');
    const rows = parseCSV(fileContent);
    let headerIdx = -1;
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      if (rows[i].some(cell => stripAccents(cell).includes('CODIGO'))) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) {
      throw new Error(`No se encontró cabecera con CODIGO en ${fileName}`);
    }

    const header = rows[headerIdx].map(c => stripAccents(c));
    const findCol = (pattern) => header.findIndex(h => h.includes(pattern));

    const colCode = findCol('CODIGO');
    const colDate = findCol('FECHA');
    const colTipo = findCol('TIPO');
    const colCedula = findCol('CEDULA');
    const colName = findCol('NOMBRES');
    const colGroup = findCol('GRUPO');
    const colDistrict = findCol('DISTRITO');
    const colRegion = findCol('REGION');
    const colUnit = findCol('UNIDAD');
    const colEmailYoung = findCol('JOVEN');
    const colEmailAdult = findCol('ADULTO');

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      const code = colCode !== -1 ? r[colCode]?.trim() : '';
      if (!code) continue;
      if (!codeFilter(code, r)) continue;

      records.push({
        sourceYear,
        code,
        dateStr: colDate !== -1 ? r[colDate]?.trim() || '' : '',
        tipoStr: colTipo !== -1 ? r[colTipo]?.trim() || '' : '',
        cedulaStr: colCedula !== -1 ? r[colCedula]?.trim() || '' : '',
        fullName: colName !== -1 ? r[colName]?.trim() || '' : '',
        groupStr: colGroup !== -1 ? r[colGroup]?.trim() || '' : '',
        districtStr: colDistrict !== -1 ? r[colDistrict]?.trim() || '' : '',
        regionStr: colRegion !== -1 ? r[colRegion]?.trim() || '' : '',
        unitStr: colUnit !== -1 ? r[colUnit]?.trim() || '' : '',
        emailYoung: colEmailYoung !== -1 ? r[colEmailYoung]?.trim() || '' : '',
        emailAdult: colEmailAdult !== -1 ? r[colEmailAdult]?.trim() || '' : ''
      });
    }
  }

  // 1. 2022
  loadStandardCSV('RECONOCIMIENTOS_ENTREGADOS.xlsx - 2022.csv', '2022');

  // 2. 2023 (skip 2024 rows mistakenly pasted in 2023 sheet)
  loadStandardCSV('RECONOCIMIENTOS_ENTREGADOS.xlsx - 2023.csv', '2023', (code) => !code.includes('24-'));

  // 3. 2024
  loadStandardCSV('RECONOCIMIENTOS_ENTREGADOS.xlsx - 2024.csv', '2024');

  // 4. 2025 (skip the duplicate rows with NO_DISPONIBLE for CCRL-1125-031 and CCRL-1125-049)
  loadStandardCSV('RECONOCIMIENTOS_ENTREGADOS.xlsx - 2025.csv', '2025', (code, row) => {
    const rawCed = row[5]?.trim() || '';
    if ((code === 'CCRL-1125-031' || code === 'CCRL-1125-049') && rawCed.toUpperCase() === 'NO_DISPONIBLE') {
      return false;
    }
    return true;
  });

  // 5. 2026
  {
    const fileContent = readFileSync(join(__dirname, '../temporal/RECONOCIMIENTOS_ENTREGADOS.xlsx - 2026.csv'), 'utf8');
    const rows = parseCSV(fileContent);
    const header = rows[0].map(c => c.trim().toLowerCase());
    const colMap = {};
    header.forEach((h, idx) => { colMap[h] = idx; });

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const code = r[colMap['codigo_unico']]?.trim();
      if (!code) continue;
      records.push({
        sourceYear: '2026',
        code,
        dateStr: r[colMap['fecha_creacion']]?.trim() || '',
        tipoStr: r[colMap['tipo']]?.trim() || '',
        cedulaStr: r[colMap['cedula']]?.trim() || '',
        fullName: r[colMap['nombres']]?.trim() || '',
        groupStr: r[colMap['grupo']]?.trim() || '',
        districtStr: r[colMap['distrito']]?.trim() || '',
        regionStr: r[colMap['region']]?.trim() || '',
        unitStr: r[colMap['unidad']]?.trim() || '',
        emailYoung: '',
        emailAdult: ''
      });
    }
  }

  return records;
}

export function groupRecordsIntoBatches(records) {
  const batchGroups = new Map(); // key: 'YYYY-MM' -> records[]

  for (const r of records) {
    let year = '';
    let month = '';

    // Check CCRL-MMYY pattern
    const match = r.code.match(/CCRL-(\d{2})(\d{2})/);
    if (match) {
      month = match[1];
      year = `20${match[2]}`;
    } else {
      // 2026 format (YYYY-MM-DD or D/M/YYYY)
      if (r.dateStr.includes('-')) {
        const parts = r.dateStr.split('-');
        year = parts[0];
        month = parts[1].padStart(2, '0');
      } else if (r.dateStr.includes('/')) {
        const parts = r.dateStr.split('/');
        year = parts[2];
        month = parts[1].padStart(2, '0');
      } else {
        year = '2026';
        month = '02';
      }
    }

    const key = `${year}-${month}`;
    if (!batchGroups.has(key)) {
      batchGroups.set(key, []);
    }
    batchGroups.get(key).push(r);
  }

  const sortedKeys = Array.from(batchGroups.keys()).sort();
  const batches = [];
  const allMembers = [];

  for (const key of sortedKeys) {
    const [year, month] = key.split('-');
    const monthName = MONTH_NAMES_ES[month] || month;
    const rawBatchRecords = batchGroups.get(key);

    // Numeric ID: YYMM01 (e.g. 220601, 230701, etc.)
    const numericBatchId = parseInt(`${year.slice(-2)}${month}01`, 10);
    const createdAt = `${year}-${month}-15T12:00:00.000Z`;

    // Process members for this batch
    const batchMembers = [];
    for (const rec of rawBatchRecords) {
      const { first_names, last_names } = splitFullName(rec.fullName);
      const identity = cleanCedula(rec.cedulaStr);
      const { groupId, districtId, regionId } = resolveHierarchy(rec.groupStr, rec.districtStr, rec.regionStr);
      const member_type = parseMemberType(rec.tipoStr, rec.unitStr);
      const unit = parseUnit(rec.unitStr, member_type);
      const email = rec.emailYoung || rec.emailAdult || undefined;

      const member = {
        identity,
        first_names,
        last_names,
        birth_date: '2000-01-01',
        member_type,
        status: 'active',
        verified_in_registry: false,
        unit,
        group_id: groupId,
        district_id: districtId,
        region_id: regionId,
        batch_id: numericBatchId,
        recognition_code: rec.code,
        user_id: TARGET_USER_ID,
        ...(email ? { email } : {})
      };

      batchMembers.push(member);
      allMembers.push(member);
    }

    // Determine batch scope properties
    const firstGroupId = batchMembers[0]?.group_id ?? 0;
    const allSameGroup = batchMembers.every(m => m.group_id === firstGroupId);
    const batchGroupId = allSameGroup ? firstGroupId : 0;

    const firstDistrictId = batchMembers[0]?.district_id ?? 0;
    const allSameDistrict = batchMembers.every(m => m.district_id === firstDistrictId);
    const batchDistrictId = allSameDistrict ? firstDistrictId : 0;

    const firstRegionId = batchMembers[0]?.region_id ?? 0;
    const allSameRegion = batchMembers.every(m => m.region_id === firstRegionId);
    const batchRegionId = allSameRegion ? firstRegionId : 0;

    const firstUnit = batchMembers[0]?.unit;
    const allSameUnit = batchMembers.every(m => m.unit === firstUnit);
    const batchUnitScope = allSameUnit && firstUnit ? firstUnit : 'mixed';

    const batch = {
      id: numericBatchId,
      comment: `Robots Letales - ${monthName} ${year}`,
      region_id: batchRegionId,
      district_id: batchDistrictId,
      group_id: batchGroupId,
      unit_scope: batchUnitScope,
      recognition_type: TARGET_RECOGNITION_TYPE,
      recognition_duration: '',
      created_at: createdAt,
      user_id: TARGET_USER_ID
    };

    batches.push({ batch, members: batchMembers });
  }

  return { batches, allMembers };
}

async function run() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('====================================================');
  console.log('MIGRACIÓN DE RECONOCIMIENTOS HISTÓRICOS (OPCIÓN B)');
  console.log(`Usuario Destino: ${TARGET_USER_ID} (antirobotsletales@scouts.org.ve)`);
  console.log(`Tipo Reconocimiento: ${TARGET_RECOGNITION_TYPE}`);
  console.log(`Modo: ${isDryRun ? 'DRY-RUN (Simulación sin escrituras)' : 'LIVE (Escritura en Firestore)'}`);
  console.log('====================================================\n');

  console.log('1. Cargando y deduplicando registros desde CSVs...');
  const records = loadAllRecords();
  console.log(`- Registros únicos cargados: ${records.length}`);

  console.log('2. Agrupando registros en lotes mensuales (Opción B)...');
  const { batches, allMembers } = groupRecordsIntoBatches(records);
  console.log(`- Total de lotes mensuales generados: ${batches.length}`);
  console.log(`- Total de miembros estructurados: ${allMembers.length}`);

  console.log('\n--- Detalle de Lotes a Crear ---');
  for (const { batch, members } of batches) {
    console.log(`  [ID ${batch.id}] ${batch.comment} | ${members.length} miembros | Región: ${batch.region_id} | Distrito: ${batch.district_id} | Grupo: ${batch.group_id} | Unidad: ${batch.unit_scope}`);
  }

  if (isDryRun) {
    console.log('\n[DRY RUN COMPLETADO] No se realizaron escrituras en Firebase.');
    process.exit(0);
  }

  console.log('\n3. Iniciando escritura en Firestore...');

  // Write batches
  console.log(`\nGuardando ${batches.length} lotes en Firestore...`);
  const batchOp = writeBatch(db);
  for (const { batch } of batches) {
    const batchRef = doc(db, 'batches', String(batch.id));
    batchOp.set(batchRef, batch);
  }
  await batchOp.commit();
  console.log(`✓ ${batches.length} lotes guardados con éxito.`);

  // Write members in chunks of 300 (Firestore limit is 500)
  console.log(`\nGuardando ${allMembers.length} miembros en colección 'scout_members'...`);
  const CHUNK_SIZE = 300;
  let savedCount = 0;

  for (let i = 0; i < allMembers.length; i += CHUNK_SIZE) {
    const chunk = allMembers.slice(i, i + CHUNK_SIZE);
    const memberBatchOp = writeBatch(db);

    for (const member of chunk) {
      // Document ID: unique recognition_code
      const memberRef = doc(db, 'scout_members', member.recognition_code);
      memberBatchOp.set(memberRef, member);
    }

    await memberBatchOp.commit();
    savedCount += chunk.length;
    console.log(`  > Guardados ${savedCount} / ${allMembers.length} miembros...`);
  }

  console.log(`\n✓ Todos los ${savedCount} miembros guardados exitosamente.`);
  console.log('\n====================================================');
  console.log('¡MIGRACIÓN COMPLETADA EXITOSAMENTE!');
  console.log('====================================================\n');
  process.exit(0);
}

// Only execute directly when run as script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch(err => {
    console.error('Error fatal durante la migración:', err);
    process.exit(1);
  });
}
