import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  doc
} from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

const hierarchyPath = join(__dirname, '../src/features/batches/api/hierarchy.json');
const hierarchyData = JSON.parse(readFileSync(hierarchyPath, 'utf8'));

async function syncCollection(collectionName, localItems, idField = 'id', compareFields = ['name']) {
  console.log(`\nConsultando colección '${collectionName}' en Firestore...`);
  const snapshot = await getDocs(collection(db, collectionName));
  const remoteMap = new Map();
  snapshot.forEach((d) => {
    remoteMap.set(String(d.id), d.data());
  });

  console.log(`- Encontrados ${remoteMap.size} registros remotos en '${collectionName}'.`);
  console.log(`- Total de registros locales en JSON: ${localItems.length}.`);

  const toWrite = [];
  for (const item of localItems) {
    const docId = String(item[idField]);
    const remote = remoteMap.get(docId);

    if (!remote) {
      toWrite.push({ item, reason: 'nuevo' });
    } else {
      const hasChanged = compareFields.some((f) => remote[f] !== item[f]);
      if (hasChanged) {
        toWrite.push({ item, reason: 'actualizado' });
      }
    }
  }

  if (toWrite.length === 0) {
    console.log(`- Todos los registros de '${collectionName}' están sincronizados.`);
    return { added: 0, updated: 0 };
  }

  console.log(`- Se subirán ${toWrite.length} registros a '${collectionName}'.`);

  let addedCount = 0;
  let updatedCount = 0;

  // Write in batches of max 400 (Firestore limit is 500)
  const CHUNK_SIZE = 400;
  for (let i = 0; i < toWrite.length; i += CHUNK_SIZE) {
    const chunk = toWrite.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const { item, reason } of chunk) {
      const docRef = doc(db, collectionName, String(item[idField]));
      batch.set(docRef, item);
      if (reason === 'nuevo') addedCount++;
      else updatedCount++;
    }

    await batch.commit();
    console.log(`  > Guardado lote de ${chunk.length} elementos en '${collectionName}'.`);
  }

  console.log(`- Completado '${collectionName}': ${addedCount} nuevos, ${updatedCount} actualizados.`);
  return { added: addedCount, updated: updatedCount };
}

async function main() {
  console.log('Iniciando sincronización de estructura scout a Firestore...');
  console.log(`Proyecto Firebase: ${firebaseConfig.projectId}`);

  try {
    const regionsResult = await syncCollection('regions', hierarchyData.regions, 'id', ['name']);
    const districtsResult = await syncCollection('districts', hierarchyData.districts, 'id', ['name', 'region_id']);
    const groupsResult = await syncCollection('groups', hierarchyData.groups, 'id', ['name', 'district_id']);

    console.log('\n========================================');
    console.log('RESUMEN DE SINCRONIZACIÓN:');
    console.log(`- Regiones:   ${regionsResult.added} nuevas, ${regionsResult.updated} actualizadas.`);
    console.log(`- Distritos:  ${districtsResult.added} nuevos, ${districtsResult.updated} actualizados.`);
    console.log(`- Grupos:     ${groupsResult.added} nuevos, ${groupsResult.updated} actualizados.`);
    console.log('========================================');
    console.log('¡Sincronización finalizada exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('Error durante la sincronización:', error);
    process.exit(1);
  }
}

main();
