import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { jsPDF } from 'jspdf';
import { db, functions } from '../../../lib/firebase';
import hierarchyData from './hierarchy.json';
import {
  Batch,
  ScoutMember,
  Region,
  District,
  ScoutGroup,
  BatchCreationParams
} from '../types';

export const RECOGNITION_TYPES = [
  { id: "sct-wood-badge", name: "Insignia de Madera" },
  { id: "sct-promesa", name: "Promesa Scout" },
  { id: "sct-merit", name: "Medalla al Mérito" },
  { id: "sct-long-service", name: "Servicio Distinguido" }
];

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
  // Return the static parsed SQLite seed database
  return hierarchyData;
}

export async function createBatch(params: BatchCreationParams): Promise<Batch> {
  const numericId = Math.floor(Math.random() * 1000000) + 1;
  const newBatch: Batch = {
    id: numericId,
    name: params.name,
    region_id: params.region_id,
    district_id: params.district_id,
    group_id: params.group_id,
    created_at: new Date().toISOString()
  };

  // Add the batch to Firestore using its numeric ID as the document name
  await setDoc(doc(db, "batches", String(numericId)), newBatch);
  return newBatch;
}

export async function updateBatch(id: number, params: BatchCreationParams): Promise<Batch> {
  const batchRef = doc(db, "batches", String(id));
  const docSnap = await getDoc(batchRef);
  
  const updatedBatch: Batch = {
    id,
    name: params.name,
    region_id: params.region_id,
    district_id: params.district_id,
    group_id: params.group_id,
    created_at: docSnap.exists() ? (docSnap.data() as Batch).created_at : new Date().toISOString()
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

export async function createMember(member: ScoutMember): Promise<ScoutMember> {
  // Use member.identity (the unique national ID/cédula) as the document key to perform safe upserts
  await setDoc(doc(db, "scout_members", member.identity), member);
  return member;
}

export async function updateMember(member: ScoutMember): Promise<ScoutMember> {
  await setDoc(doc(db, "scout_members", member.identity), member);
  return member;
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

export async function getAllBatches(): Promise<Batch[]> {
  const querySnapshot = await getDocs(collection(db, "batches"));
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

export async function generateBatchReport(batchId: number): Promise<string> {
  const batch = await getBatchById(batchId);
  if (!batch) throw new Error("Lote no encontrado");
  const members = await getMembersByBatchId(batchId);
  const hierarchy = await getHierarchyData();
  
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
  docPdf.text(`Nombre: ${batch.name}`, 14, 50);
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
  
  // Table rows
  for (const m of members) {
    if (y > 270) {
      docPdf.addPage();
      y = 20;
      // Re-draw simple header on new page
      docPdf.setFont("helvetica", "bold");
      docPdf.text("Lista de Miembros (Continuación)", 14, y);
      y += 10;
    }
    
    const fullName = `${m.first_name} ${m.last_name}`;
    const typeStr = m.member_type === 'young' ? 'Joven' : 'Adulto';
    const statusStr = m.status === 'active' ? 'Registro Válido' : 'Pendiente';
    
    // Draw row separator
    docPdf.setDrawColor(245, 245, 245);
    docPdf.line(14, y + 1, 196, y + 1);
    
    docPdf.text(m.identity, 16, y);
    docPdf.text(fullName.substring(0, 35), 46, y);
    docPdf.text(typeStr, 116, y);
    
    if (m.status === 'active') {
      docPdf.setTextColor(40, 167, 69); // Green
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
