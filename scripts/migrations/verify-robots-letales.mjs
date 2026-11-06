import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs
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

async function verify() {
  console.log('====================================================');
  console.log('VERIFICACIÓN DE DATOS EN FIRESTORE');
  console.log(`Usuario: ${TARGET_USER_ID} (antirobotsletales@scouts.org.ve)`);
  console.log('====================================================\n');

  // 1. Query batches
  console.log('1. Consultando lotes en Firestore...');
  const batchesQuery = query(collection(db, 'batches'), where('user_id', '==', TARGET_USER_ID));
  const batchesSnap = await getDocs(batchesQuery);
  console.log(`✓ Lotes encontrados: ${batchesSnap.size} / 28 esperados.`);

  const batches = [];
  batchesSnap.forEach(d => batches.push(d.data()));
  batches.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  // 2. Query members
  console.log('\n2. Consultando miembros en Firestore...');
  const membersQuery = query(collection(db, 'scout_members'), where('user_id', '==', TARGET_USER_ID));
  const membersSnap = await getDocs(membersQuery);
  console.log(`✓ Miembros encontrados: ${membersSnap.size} / 489 esperados.`);

  const membersByBatch = new Map();
  membersSnap.forEach(d => {
    const m = d.data();
    if (!membersByBatch.has(m.batch_id)) {
      membersByBatch.set(m.batch_id, []);
    }
    membersByBatch.get(m.batch_id).push(m);
  });

  console.log('\n3. Verificación de lotes y conteo de miembros asociados:');
  let allBatchesValid = true;
  for (const b of batches) {
    const count = membersByBatch.get(b.id)?.length || 0;
    const ok = count > 0;
    if (!ok) allBatchesValid = false;
    console.log(`  [ID ${b.id}] ${b.comment} -> ${count} miembros (${ok ? 'CORRECTO' : 'SIN MIEMBROS'})`);
  }

  // Summary statistics
  const totalWithCedula = Array.from(membersSnap.docs)
    .filter(d => d.data().identity !== 'S/C').length;
  const totalSinCedula = Array.from(membersSnap.docs)
    .filter(d => d.data().identity === 'S/C').length;

  console.log('\n====================================================');
  console.log('RESUMEN DE VERIFICACIÓN:');
  console.log(`- Total Lotes:            ${batchesSnap.size} (esperado 28)`);
  console.log(`- Total Reconocimientos:  ${membersSnap.size} (esperado 489)`);
  console.log(`- Con Cédula Válida:      ${totalWithCedula}`);
  console.log(`- Sin Cédula (S/C):       ${totalSinCedula}`);
  console.log(`- Estado de Lotes:        ${allBatchesValid ? '100% VÁLIDOS' : 'HAY ERRORES'}`);
  console.log('====================================================\n');

  if (batchesSnap.size === 28 && membersSnap.size === 489 && allBatchesValid) {
    console.log('✓ ¡TODOS LOS DATOS ESTÁN CORRECTAMENTE REGISTRADOS EN FIRESTORE!');
    process.exit(0);
  } else {
    console.error('✗ Discrepancia encontrada en la verificación.');
    process.exit(1);
  }
}

verify().catch(err => {
  console.error('Error durante la verificación:', err);
  process.exit(1);
});
