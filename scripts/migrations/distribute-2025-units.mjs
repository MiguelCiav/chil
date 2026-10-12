import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  writeBatch
} from 'firebase/firestore';

const TARGET_USER_ID = 'E61QjuStl0eNLG0glUqMqhY7S2F3';

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

const isDryRun = process.argv.includes('--dry-run');

async function run() {
  console.log('====================================================');
  console.log('DISTRIBUCIÓN NORMAL DE UNIDADES PARA EL AÑO 2025');
  console.log(`Usuario: ${TARGET_USER_ID}`);
  console.log(`Modo: ${isDryRun ? 'DRY-RUN (Simulación sin escrituras)' : 'PRODUCCIÓN (Escritura en Firestore)'}`);
  console.log('====================================================\n');

  // 1. Obtener lotes de 2025
  const bSnap = await getDocs(query(collection(db, 'batches'), where('user_id', '==', TARGET_USER_ID)));
  const b2025 = bSnap.docs
    .map(d => ({ docId: d.id, ...d.data() }))
    .filter(b => b.created_at && new Date(b.created_at).getFullYear() === 2025);

  const bIds = b2025.map(b => b.id);
  console.log(`Lotes de 2025 encontrados (${bIds.length}):`, bIds);

  // 2. Obtener miembros de 2025
  const mSnap = await getDocs(query(collection(db, 'scout_members'), where('batch_id', 'in', bIds)));
  const members = mSnap.docs.map(d => ({ docId: d.id, ...d.data() }));
  console.log(`Miembros de 2025 encontrados: ${members.length}`);

  if (members.length !== 157) {
    console.warn(`Advertencia: Se esperaban 157 miembros en 2025, pero se encontraron ${members.length}.`);
  }

  // 3. Ordenar miembros por edad (cédulas más bajas primero -> mayores; S/C al final -> más jóvenes)
  members.sort((a, b) => {
    const isSCA = a.identity === 'S/C';
    const isSCB = b.identity === 'S/C';
    if (isSCA && !isSCB) return 1;
    if (!isSCA && isSCB) return -1;
    if (isSCA && isSCB) return (a.recognition_code || '').localeCompare(b.recognition_code || '');
    return parseInt(a.identity, 10) - parseInt(b.identity, 10);
  });

  // Distribución normal sobre las unidades juveniles:
  // Clan: 12 (7.6%)
  // Caminantes: 25 (15.9%)
  // Tropa: 72 (45.9% - el que más tiene)
  // Manada: 48 (30.6% - segundo)
  // Total: 12 + 25 + 72 + 48 = 157
  const CLAN_COUNT = 12;
  const CAMINANTES_COUNT = 25;
  const TROPA_COUNT = 72;
  const MANADA_COUNT = members.length - (CLAN_COUNT + CAMINANTES_COUNT + TROPA_COUNT);

  const plan = members.map((m, idx) => {
    let unit = 'manada';
    if (idx < CLAN_COUNT) {
      unit = 'clan';
    } else if (idx < CLAN_COUNT + CAMINANTES_COUNT) {
      unit = 'caminantes';
    } else if (idx < CLAN_COUNT + CAMINANTES_COUNT + TROPA_COUNT) {
      unit = 'tropa';
    } else {
      unit = 'manada';
    }
    return { ...m, unit };
  });

  const unitTotals = {
    tropa: plan.filter(m => m.unit === 'tropa').length,
    manada: plan.filter(m => m.unit === 'manada').length,
    caminantes: plan.filter(m => m.unit === 'caminantes').length,
    clan: plan.filter(m => m.unit === 'clan').length,
    institucional: plan.filter(m => m.unit === 'institucional').length,
    no_scout: plan.filter(m => m.unit === 'no_scout').length
  };

  console.log('\n--- Distribución resultante para 2025 ---');
  console.log(`1. Tropa:       ${unitTotals.tropa} (${((unitTotals.tropa / members.length) * 100).toFixed(1)}%)`);
  console.log(`2. Manada:      ${unitTotals.manada} (${((unitTotals.manada / members.length) * 100).toFixed(1)}%)`);
  console.log(`3. Caminantes:  ${unitTotals.caminantes} (${((unitTotals.caminantes / members.length) * 100).toFixed(1)}%)`);
  console.log(`4. Clan:        ${unitTotals.clan} (${((unitTotals.clan / members.length) * 100).toFixed(1)}%)`);
  console.log(`5. Institucional: ${unitTotals.institucional}`);
  console.log(`6. No Scout:    ${unitTotals.no_scout}`);
  console.log(`Total:          ${members.length}`);

  if (isDryRun) {
    console.log('\n[DRY RUN COMPLETADO] No se realizaron escrituras.');
    process.exit(0);
  }

  // 4. Escribir cambios en Firestore por lotes
  console.log('\nActualizando documentos de miembros en Firestore...');
  const BATCH_SIZE = 400;
  for (let i = 0; i < plan.length; i += BATCH_SIZE) {
    const chunk = plan.slice(i, i + BATCH_SIZE);
    const wb = writeBatch(db);
    for (const m of chunk) {
      const docRef = doc(db, 'scout_members', m.docId);
      wb.update(docRef, { unit: m.unit });
    }
    await wb.commit();
    console.log(`✓ Actualizados miembros ${i + 1} a ${i + chunk.length}`);
  }

  // 5. Actualizar unit_scope de los lotes a 'mixed'
  console.log('\nActualizando unit_scope de lotes a "mixed"...');
  const batchWb = writeBatch(db);
  for (const b of b2025) {
    const bRef = doc(db, 'batches', b.docId);
    batchWb.update(bRef, { unit_scope: 'mixed' });
  }
  await batchWb.commit();
  console.log('✓ unit_scope de lotes actualizado con éxito.');

  console.log('\n¡Distribución de unidades para 2025 completada con éxito!');
  process.exit(0);
}

run().catch(err => {
  console.error('Error durante la ejecución:', err);
  process.exit(1);
});
