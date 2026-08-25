import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  writeBatch,
  deleteDoc
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { jsPDF } from 'jspdf';
import { db, functions, auth } from '../../../lib/firebase';
import hierarchyData from './hierarchy.json';
import {
  Batch,
  ScoutMember,
  Region,
  District,
  ScoutGroup,
  BatchCreationParams
} from '../types';

export interface RecognitionTypeInfo {
  id: string;
  name: string;
  category?: string;
}

export const RECOGNITION_TYPES: RecognitionTypeInfo[] = [
  { id: "sct-wood-badge", name: "Insignia de Madera" },
  { id: "sct-promesa", name: "Promesa Scout" },
  { id: "sct-merit", name: "Medalla al Mérito" },
  { id: "sct-long-service", name: "Servicio Distinguido" },
  { id: "sct-service-prolonged", name: "Servicio Prolongado" },
  { id: "sct-plastic-tide", name: "Embajadores de la Marea de Plástico" },
  { id: "sct-earth-tribe", name: "Tribu de la Tierra" },
  { id: "sct-champions-nature", name: "Campeones por la Naturaleza" },
  { id: "sct-go-solar", name: "Go Solar" }
];

export function getRecognitionBadgeStyle(recognitionIdOrName?: string): { bg: string; text: string; border: string; pillClass: string } {
  if (!recognitionIdOrName) {
    return {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-200',
      pillClass: 'bg-gray-100 text-gray-700 border border-gray-200'
    };
  }
  const lower = recognitionIdOrName.toLowerCase();
  if (lower.includes('plástico') || lower.includes('plastico') || lower.includes('marea') || lower.includes('plastic')) {
    return {
      bg: 'bg-sky-100',
      text: 'text-sky-800',
      border: 'border-sky-200',
      pillClass: 'bg-sky-100 text-sky-800 border border-sky-200'
    };
  }
  if (lower.includes('tribu') || lower.includes('tierra') || lower.includes('earth')) {
    return {
      bg: 'bg-[#e9e7db]',
      text: 'text-[#5e5c46]',
      border: 'border-[#d6d3c2]',
      pillClass: 'bg-[#e9e7db] text-[#5e5c46] border border-[#d6d3c2]'
    };
  }
  if (lower.includes('campeones') || lower.includes('naturaleza') || lower.includes('champions')) {
    return {
      bg: 'bg-[#fee2d8]',
      text: 'text-[#c2410c]',
      border: 'border-[#fdba74]',
      pillClass: 'bg-[#fee2d8] text-[#c2410c] border border-[#fdba74]'
    };
  }
  if (lower.includes('solar')) {
    return {
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      border: 'border-amber-200',
      pillClass: 'bg-amber-100 text-amber-800 border border-amber-200'
    };
  }
  if (lower.includes('servicio') || lower.includes('service') || lower.includes('distinguido') || lower.includes('prolongado')) {
    return {
      bg: 'bg-amber-100',
      text: 'text-amber-900',
      border: 'border-amber-200',
      pillClass: 'bg-amber-100 text-amber-900 border border-amber-200'
    };
  }
  if (lower.includes('promesa') || lower.includes('wood') || lower.includes('madera')) {
    return {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      border: 'border-blue-200',
      pillClass: 'bg-blue-100 text-blue-800 border border-blue-200'
    };
  }
  if (lower.includes('mérito') || lower.includes('merito')) {
    return {
      bg: 'bg-emerald-100',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      pillClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200'
    };
  }
  return {
    bg: 'bg-primary/10',
    text: 'text-primary',
    border: 'border-primary/20',
    pillClass: 'bg-primary/10 text-primary border border-primary/20'
  };
}

export function getRecognitionName(recognitionIdOrName?: string): string {
  if (!recognitionIdOrName) return '-';
  const found = RECOGNITION_TYPES.find(r => r.id === recognitionIdOrName || r.name.toLowerCase() === recognitionIdOrName.toLowerCase());
  return found ? found.name : recognitionIdOrName;
}

export async function deleteBatch(batchId: number): Promise<void> {
  const membersQuery = query(collection(db, "scout_members"), where("batch_id", "==", batchId));
  const membersSnapshot = await getDocs(membersQuery);

  const batchOp = writeBatch(db);
  membersSnapshot.forEach((docSnapshot) => {
    batchOp.delete(docSnapshot.ref);
  });

  const batchDocRef = doc(db, "batches", String(batchId));
  batchOp.delete(batchDocRef);

  await batchOp.commit();
}
// Helper to check and print browser environment details for storage
const safeGetItem = (key: string): string | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (e) {
    console.warn("Storage item fetch failed", e);
  }
  return null;
};

const safeSetItem = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (e) {
    console.warn("Storage item write failed", e);
  }
};

export async function getHierarchyData(): Promise<{ regions: Region[]; districts: District[]; groups: ScoutGroup[] }> {
  try {
    const [regionsSnap, districtsSnap, groupsSnap] = await Promise.all([
      getDocs(collection(db, "regions")),
      getDocs(collection(db, "districts")),
      getDocs(collection(db, "groups")),
    ]);

    const regions = regionsSnap.docs.map(d => d.data() as Region);
    const districts = districtsSnap.docs.map(d => d.data() as District);
    const groups = groupsSnap.docs.map(d => d.data() as ScoutGroup);

    if (regions.length === 0) {
      console.log("Firestore hierarchy collections empty. Seeding...");

      // Seed Regions
      const regionBatch = writeBatch(db);
      for (const r of hierarchyData.regions) {
        regionBatch.set(doc(db, "regions", String(r.id)), r);
      }
      await regionBatch.commit();

      // Seed Districts
      const districtBatch = writeBatch(db);
      for (const d of hierarchyData.districts) {
        districtBatch.set(doc(db, "districts", String(d.id)), d);
      }
      await districtBatch.commit();

      // Seed Groups
      const groupBatch = writeBatch(db);
      for (const g of hierarchyData.groups) {
        groupBatch.set(doc(db, "groups", String(g.id)), g);
      }
      await groupBatch.commit();

      console.log("Seeding complete!");
      return {
        regions: hierarchyData.regions,
        districts: hierarchyData.districts,
        groups: hierarchyData.groups
      };
    }

    regions.sort((a, b) => a.id - b.id);
    districts.sort((a, b) => a.id - b.id);
    groups.sort((a, b) => a.id - b.id);

    return { regions, districts, groups };
  } catch (error) {
    console.error("Failed to fetch hierarchy from Firestore, falling back to local JSON:", error);
    return hierarchyData;
  }
}

function generateSecureBatchId(): number {
  const array = new Uint32Array(1);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(array);
    return (array[0] % 1_000_000) + 1;
  }
  return (Date.now() % 1_000_000) + 1;
}

export async function createBatch(params: BatchCreationParams, userId?: string): Promise<Batch> {
  const numericId = generateSecureBatchId();
  const targetUserId = params.user_id || (userId !== undefined ? userId : (auth.currentUser?.uid || ''));
  const newBatch: Batch = {
    id: numericId,
    comment: params.comment || '',
    region_id: params.region_id,
    district_id: params.district_id,
    group_id: params.group_id,
    unit_scope: params.unit_scope || 'mixed',
    recognition_type: params.recognition_type,
    recognition_duration: params.recognition_duration || '',
    created_at: new Date().toISOString(),
    ...(targetUserId ? { user_id: targetUserId } : {})
  };

  // Add the batch to Firestore using its numeric ID as the document name
  await setDoc(doc(db, "batches", String(numericId)), newBatch);
  return newBatch;
}

export async function updateBatch(id: number, params: BatchCreationParams, userId?: string): Promise<Batch> {
  const batchRef = doc(db, "batches", String(id));
  const docSnap = await getDoc(batchRef);
  const existingData = docSnap.exists() ? (docSnap.data() as Batch) : null;
  const targetUserId = params.user_id || (userId !== undefined ? userId : (existingData?.user_id || auth.currentUser?.uid || ''));

  const updatedBatch: Batch = {
    id,
    comment: params.comment || '',
    region_id: params.region_id,
    district_id: params.district_id,
    group_id: params.group_id,
    unit_scope: params.unit_scope || existingData?.unit_scope || 'mixed',
    recognition_type: params.recognition_type,
    recognition_duration: params.recognition_duration || '',
    created_at: existingData ? existingData.created_at : new Date().toISOString(),
    ...(targetUserId ? { user_id: targetUserId } : {})
  };

  await setDoc(batchRef, updatedBatch);
  return updatedBatch;
}

export interface ScraperMemberDetails {
  nombre_completo: string;
  status: string;
  telefono: string;
  correo_electronico: string;
  fecha_nacimiento: string;
}

export interface ScraperCredentials {
  email: string;
  password: string;
}

export async function getMemberStatus(cedula: string): Promise<ScraperMemberDetails> {
  const credentialsJson = safeGetItem('chil_scraper_credentials');
  const credentials = credentialsJson ? JSON.parse(credentialsJson) : null;

  try {
    const getStatusFn = httpsCallable<{ cedula: string; credentials?: ScraperCredentials }, ScraperMemberDetails>(
      functions,
      'getMemberStatus'
    );
    const result = await getStatusFn({ cedula, credentials });
    return result.data;
  } catch (error: unknown) {
    console.error("Scraper function failed:", error);
    const err = error as Error;
    throw new Error(err?.message || "Error de red", { cause: error });
  }
}

export async function createMember(member: ScoutMember, userId?: string): Promise<ScoutMember> {
  const targetUserId = member.user_id || (userId !== undefined ? userId : (auth.currentUser?.uid || ''));
  const newMember: ScoutMember = {
    ...member,
    ...(targetUserId ? { user_id: targetUserId } : {})
  };
  // Use member.identity (the unique national ID/cédula) as the document key to perform safe upserts
  await setDoc(doc(db, "scout_members", member.identity), newMember);
  return newMember;
}

export async function updateMember(member: ScoutMember, userId?: string): Promise<ScoutMember> {
  const targetUserId = member.user_id || (userId !== undefined ? userId : (auth.currentUser?.uid || ''));
  const updatedMember: ScoutMember = {
    ...member,
    ...(targetUserId ? { user_id: targetUserId } : {})
  };
  await setDoc(doc(db, "scout_members", member.identity), updatedMember);
  return updatedMember;
}

export async function deleteMember(identity: string): Promise<void> {
  await deleteDoc(doc(db, "scout_members", identity));
}

export async function getMembersByBatchId(batchId: number): Promise<ScoutMember[]> {
  const q = query(collection(db, "scout_members"), where("batch_id", "==", batchId));
  const querySnapshot = await getDocs(q);
  const members: ScoutMember[] = [];
  querySnapshot.forEach((docSnapshot) => {
    members.push(docSnapshot.data() as ScoutMember);
  });
  return members;
}

export async function getAllMembers(userId?: string): Promise<ScoutMember[]> {
  const targetUserId = userId !== undefined ? userId : (auth.currentUser?.uid || '');
  if (!targetUserId) {
    return [];
  }
  const userBatches = await getAllBatches(targetUserId);
  if (userBatches.length === 0) {
    return [];
  }
  const batchIds = userBatches.map(b => b.id);
  // Chunk batchIds in slices of 30 because Firestore 'in' operator supports max 30 items
  const chunks: number[][] = [];
  for (let i = 0; i < batchIds.length; i += 30) {
    chunks.push(batchIds.slice(i, i + 30));
  }
  const memberPromises = chunks.map(async (chunk) => {
    const q = query(collection(db, "scout_members"), where("batch_id", "in", chunk));
    const snap = await getDocs(q);
    return snap.docs.map(docSnapshot => docSnapshot.data() as ScoutMember);
  });
  const results = await Promise.all(memberPromises);
  return results.flat();
}

export async function getAllBatches(userId?: string): Promise<Batch[]> {
  const targetUserId = userId !== undefined ? userId : (auth.currentUser?.uid || '');
  if (!targetUserId) {
    return [];
  }
  const q = query(collection(db, "batches"), where("user_id", "==", targetUserId));
  const querySnapshot = await getDocs(q);
  const batches: Batch[] = [];
  querySnapshot.forEach((docSnapshot) => {
    batches.push(docSnapshot.data() as Batch);
  });
  // Sort batches by creation date descending
  return batches.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getBatchById(id: number): Promise<Batch | null> {
  const docRef = doc(db, "batches", String(id));
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as Batch;
  }
  return null;
}

export async function saveScraperCredentials(credentials: ScraperCredentials): Promise<void> {
  safeSetItem('chil_scraper_credentials', JSON.stringify(credentials));
}

export async function hasScraperCredentials(): Promise<boolean> {
  return safeGetItem('chil_scraper_credentials') !== null;
}

export async function loginScraper(): Promise<void> {
  const credentialsJson = safeGetItem('chil_scraper_credentials');
  if (!credentialsJson) {
    throw new Error("No hay credenciales configuradas");
  }
  const credentials = JSON.parse(credentialsJson);

  try {
    const loginFn = httpsCallable<{ credentials: ScraperCredentials }, void>(
      functions,
      'loginScraper'
    );
    await loginFn({ credentials });
  } catch (error: unknown) {
    console.error("Scraper login failed:", error);
    const err = error as Error;
    throw new Error(err?.message || "Credenciales incorrectas o inicio de sesión fallido", { cause: error });
  }
}

export function exportMembersToCSV(batch: Batch, members: ScoutMember[]): void {
  const headers = ['Cédula', 'Nombres', 'Apellidos', 'Tipo', 'Estatus', 'Código Rec.', 'Fecha Nacimiento', 'Email', 'Teléfono'];
  const rows = members.map(m => [
    `"${m.identity || ''}"`,
    `"${m.first_names || ''}"`,
    `"${m.last_names || ''}"`,
    `"${m.member_type === 'young' ? 'Joven' : 'Adulto'}"`,
    `"${m.status === 'active' ? 'Registro Válido' : m.status === 'exceptional' ? 'Emisión Excepcional' : 'No registrado'}"`,
    `"${m.recognition_code || '-'}"`,
    `"${m.birth_date || '-'}"`,
    `"${m.email || ''}"`,
    `"${m.phone || ''}"`
  ]);
  
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Lote_${batch.id}_miembros.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
export async function generateBatchReport(
  batchOrId: number | Batch,
  membersParam?: ScoutMember[],
  hierarchyParam?: { regions: Region[]; districts: District[]; groups: ScoutGroup[] }
): Promise<string> {
  let batch: Batch | null = null;
  if (typeof batchOrId === 'number') {
    batch = await getBatchById(batchOrId);
  } else {
    batch = batchOrId;
  }
  if (!batch) throw new Error("Lote no encontrado");
  const members = membersParam || (await getMembersByBatchId(batch.id));
  const hierarchy = hierarchyParam || (await getHierarchyData());
  
  const region = hierarchy.regions.find(r => r.id === batch.region_id)?.name || `Región ${batch.region_id}`;
  const district = hierarchy.districts.find(d => d.id === batch.district_id)?.name || `Distrito ${batch.district_id}`;
  const group = hierarchy.groups.find(g => g.id === batch.group_id)?.name || `Grupo ${batch.group_id}`;

  const docPdf = new jsPDF();
  
  // Title / Header
  docPdf.setFontSize(22);
  docPdf.setTextColor(33, 33, 33);
  docPdf.text("Reporte de Registro de Lote", 14, 20);
  
  docPdf.setFontSize(12);
  docPdf.setTextColor(100, 100, 100);
  docPdf.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 28);
  
  // Horizontal separator line
  docPdf.setDrawColor(200, 200, 200);
  docPdf.line(14, 32, 196, 32);
  
  // Batch details section
  docPdf.setFontSize(14);
  docPdf.setTextColor(0, 0, 0);
  docPdf.setFont("helvetica", "bold");
  docPdf.text("Información del Lote", 14, 42);
  
  docPdf.setFont("helvetica", "normal");
  docPdf.setFontSize(11);
  docPdf.text(`Comentario: ${batch.comment || 'Ninguno'}`, 14, 50);
  docPdf.text(`ID del Lote: ${batch.id}`, 14, 56);
  docPdf.text(`Fecha de Creación: ${new Date(batch.created_at).toLocaleString()}`, 14, 62);
  
  docPdf.text(`Región: ${region}`, 110, 50);
  docPdf.text(`Distrito: ${district}`, 110, 56);
  docPdf.text(`Grupo: ${group}`, 110, 62);
  
  docPdf.line(14, 68, 196, 68);
  
  // Member summary metrics
  const activeCount = members.filter(m => m.status === 'active').length;
  const pendingCount = members.filter(m => m.status === 'pending').length;
  
  docPdf.setFont("helvetica", "bold");
  docPdf.text("Resumen de Miembros", 14, 76);
  
  docPdf.setFont("helvetica", "normal");
  docPdf.text(`Total Miembros: ${members.length}`, 14, 84);
  docPdf.text(`Miembros Activos (Válidos): ${activeCount}`, 70, 84);
  docPdf.text(`Miembros Pendientes (No Registrados): ${pendingCount}`, 130, 84);
  
  docPdf.line(14, 90, 196, 90);
  
  // Table header
  docPdf.setFont("helvetica", "bold");
  docPdf.text("Lista de Miembros", 14, 98);
  
  let y = 108;
  docPdf.setFillColor(240, 240, 240);
  docPdf.rect(14, y - 6, 182, 8, "F");
  
  docPdf.setFontSize(10);
  docPdf.text("Cédula", 16, y - 1);
  docPdf.text("Nombre Completo", 46, y - 1);
  docPdf.text("Tipo", 116, y - 1);
  docPdf.text("Estado", 146, y - 1);
  
  docPdf.setFont("helvetica", "normal");
  y += 6;
  
  // Sort members alphabetically by last_names, then first_names
  const sortedMembers = [...members].sort((a, b) => {
    const nameA = `${a.last_names} ${a.first_names}`.toLowerCase();
    const nameB = `${b.last_names} ${b.first_names}`.toLowerCase();
    return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
  });

  // Table rows
  for (const m of sortedMembers) {
    if (y > 270) {
      docPdf.addPage();
      y = 20;
      // Re-draw simple header on new page
      docPdf.setFont("helvetica", "bold");
      docPdf.text("Lista de Miembros (Continuación)", 14, y);
      y += 10;
      docPdf.setFont("helvetica", "normal");
    }
    
    const fullName = `${m.first_names} ${m.last_names}`;
    const typeStr = m.member_type === 'young' ? 'Joven' : 'Adulto';
    const isActive = m.status === 'active';
    const isExceptional = m.status === 'exceptional';
    const statusStr = isActive ? 'Registro Válido' : isExceptional ? 'Emisión Excepcional' : 'No registrado';
    
    // Draw row separator
    docPdf.setDrawColor(245, 245, 245);
    docPdf.line(14, y + 1, 196, y + 1);
    
    docPdf.text(m.identity, 16, y);
    docPdf.text(fullName.substring(0, 35), 46, y);
    docPdf.text(typeStr, 116, y);
    
    if (isActive) {
      docPdf.setTextColor(40, 167, 69); // Green
    } else if (isExceptional) {
      docPdf.setTextColor(126, 34, 206); // Purple #7e22ce
    } else {
      docPdf.setTextColor(220, 53, 69); // Red
    }
    docPdf.text(statusStr, 146, y);
    docPdf.setTextColor(0, 0, 0); // Reset
    
    y += 8;
  }
  
  const fileName = `Reporte_Lote_${batch.id}.pdf`;
  docPdf.save(fileName);
  return fileName;
}

export * from '../utils/codeGenerator';

