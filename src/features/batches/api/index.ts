import { invoke } from '@tauri-apps/api/core';
import {
  Batch,
  ScoutMember,
  Region,
  District,
  ScoutGroup,
  BatchCreationParams
} from '../types';

// Mock hierarchy data to fallback to if Tauri command is not found or for testing
export const MOCK_REGIONS: Region[] = [
  { id: 1, name: "Región Capital" },
  { id: 2, name: "Región Central" },
  { id: 3, name: "Región Zuliana" },
  { id: 4, name: "Región Los Andes" }
];

export const MOCK_DISTRICTS: District[] = [
  // Capital
  { id: 10, name: "Distrito Sucre", region_id: 1 },
  { id: 11, name: "Distrito Chacao", region_id: 1 },
  { id: 12, name: "Distrito Baruta", region_id: 1 },
  // Central
  { id: 20, name: "Distrito Valencia", region_id: 2 },
  { id: 21, name: "Distrito Maracay", region_id: 2 },
  // Zuliana
  { id: 30, name: "Distrito Maracaibo", region_id: 3 },
  // Los Andes
  { id: 40, name: "Distrito Mérida", region_id: 4 }
];

export const MOCK_GROUPS: ScoutGroup[] = [
  // Sucre
  { id: 100, name: "Grupo Scout San Luis", district_id: 10 },
  { id: 101, name: "Grupo Scout Don Bosco", district_id: 10 },
  // Chacao
  { id: 110, name: "Grupo Scout Chacao", district_id: 11 },
  // Baruta
  { id: 120, name: "Grupo Scout La Trinidad", district_id: 12 },
  // Valencia
  { id: 200, name: "Grupo Scout Cabriales", district_id: 20 },
  // Maracaibo
  { id: 300, name: "Grupo Scout Coquivacoa", district_id: 30 }
];

export const RECOGNITION_TYPES = [
  { id: "sct-wood-badge", name: "Insignia de Madera" },
  { id: "sct-promesa", name: "Promesa Scout" },
  { id: "sct-merit", name: "Medalla al Mérito" },
  { id: "sct-long-service", name: "Servicio Distinguido" }
];

// Helper to check if we are in Tauri environment
const isTauri = typeof window !== 'undefined' && (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !== undefined;

// Safe Storage Helpers to prevent failures in test environments
const safeGetItem = (key: string): string | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.getItem === 'function') {
      return window.localStorage.getItem(key);
    }
  } catch (e) {
    console.warn("Storage item fetch failed", e);
  }
  return null;
};

const safeSetItem = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.setItem === 'function') {
      window.localStorage.setItem(key, value);
    }
  } catch (e) {
    console.warn("Storage item write failed", e);
  }
};

export async function getHierarchyData(): Promise<{ regions: Region[]; districts: District[]; groups: ScoutGroup[] }> {
  if (isTauri) {
    try {
      interface RustGroup {
        id: number;
        name: string;
        district_id: number;
      }
      interface RustDistrict {
        id: number;
        name: string;
        region_id: number;
        groups: RustGroup[];
      }
      interface RustRegion {
        id: number;
        name: string;
        districts: RustDistrict[];
      }
      interface RustHierarchy {
        regions: RustRegion[];
      }

      const rawData = await invoke<RustHierarchy>('get_hierarchy_data');
      
      const regions: Region[] = [];
      const districts: District[] = [];
      const groups: ScoutGroup[] = [];

      if (rawData && Array.isArray(rawData.regions)) {
        for (const r of rawData.regions) {
          regions.push({ id: r.id, name: r.name });
          if (Array.isArray(r.districts)) {
            for (const d of r.districts) {
              districts.push({ id: d.id, name: d.name, region_id: d.region_id });
              if (Array.isArray(d.groups)) {
                for (const g of d.groups) {
                  groups.push({ id: g.id, name: g.name, district_id: g.district_id });
                }
              }
            }
          }
        }
      }

      return { regions, districts, groups };
    } catch (error) {
      console.warn("get_hierarchy_data IPC failed, using mock hierarchy data", error);
    }
  }
  return {
    regions: MOCK_REGIONS,
    districts: MOCK_DISTRICTS,
    groups: MOCK_GROUPS
  };
}

export async function createBatch(params: BatchCreationParams): Promise<Batch> {
  if (isTauri) {
    try {
      return await invoke<Batch>('create_batch', {
        name: params.name,
        regionId: params.region_id,
        districtId: params.district_id,
        groupId: params.group_id
      });
    } catch (error) {
      console.warn("create_batch IPC failed, simulating database batch creation", error);
    }
  }
  // Simulated database insert
  const newBatch: Batch = {
    id: Math.floor(Math.random() * 1000000) + 1,
    name: params.name,
    region_id: params.region_id,
    district_id: params.district_id,
    group_id: params.group_id,
    created_at: new Date().toISOString()
  };
  
  // Persist batches to localstorage for listing/detail simulation
  const batches = JSON.parse(safeGetItem('chil_batches') || '[]');
  batches.push(newBatch);
  safeSetItem('chil_batches', JSON.stringify(batches));
  
  return newBatch;
}

export interface ScraperMemberDetails {
  nombre_completo: string;
  status: string;
  telefono: string;
  correo_electronico: string;
  fecha_nacimiento: string;
}

export async function getMemberStatus(cedula: string): Promise<ScraperMemberDetails> {
  if (isTauri) {
    // Call the REAL backend command get_member_status
    return await invoke<ScraperMemberDetails>('get_member_status', { cedula });
  }
  
  // Simulated network scraper delay
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 600));
  
  // Demo mock scraping responses based on cedula endings for easy E2E testing
  if (cedula.endsWith('9') || cedula.endsWith('0')) {
    throw new Error("No registrado");
  } else if (cedula.endsWith('8')) {
    throw new Error("Error de red");
  }
  
  return {
    nombre_completo: `Miembro Scrapeado ${cedula}`,
    status: "Activo",
    telefono: "0414-1234567",
    correo_electronico: `member.${cedula}@gmail.com`,
    fecha_nacimiento: "1995-05-15"
  };
}

// REAL backend command integration for Scout Members
export async function createMember(member: ScoutMember): Promise<ScoutMember> {
  if (isTauri) {
    try {
      // The Rust backend command expects `member_data` mapped to `memberData`
      return await invoke<ScoutMember>('create_member', { memberData: member });
    } catch (e) {
      console.error("Backend create_member failed:", e);
      throw e;
    }
  }
  
  // Browser state simulation
  const key = `batch_members_${member.batch_id || 0}`;
  const members = JSON.parse(safeGetItem(key) || '[]');
  // Check if member already exists to prevent duplicate keys in mock state
  const existsIndex = members.findIndex((m: ScoutMember) => m.identity === member.identity);
  if (existsIndex > -1) {
    members[existsIndex] = member;
  } else {
    members.push(member);
  }
  safeSetItem(key, JSON.stringify(members));
  return member;
}

export async function updateMember(member: ScoutMember): Promise<ScoutMember> {
  if (isTauri) {
    try {
      return await invoke<ScoutMember>('update_member', { memberData: member });
    } catch (e) {
      console.error("Backend update_member failed:", e);
      throw e;
    }
  }
  
  const key = `batch_members_${member.batch_id || 0}`;
  let members = JSON.parse(safeGetItem(key) || '[]');
  members = members.map((m: ScoutMember) => m.identity === member.identity ? member : m);
  safeSetItem(key, JSON.stringify(members));
  return member;
}

export async function getMembersByBatchId(batchId: number): Promise<ScoutMember[]> {
  if (isTauri) {
    try {
      const allMembers = await invoke<ScoutMember[]>('get_all_members');
      return allMembers.filter(m => m.batch_id === batchId);
    } catch (e) {
      console.error("Backend get_all_members failed:", e);
    }
  }
  
  const key = `batch_members_${batchId}`;
  return JSON.parse(safeGetItem(key) || '[]');
}

export async function generateBatchReport(batchId: number): Promise<string> {
  if (isTauri) {
    try {
      return await invoke<string>('generate_batch_report', { batchId, outputPath: "" });
    } catch (e) {
      console.warn("generate_batch_report IPC failed, simulating PDF generation", e);
    }
  }
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  return `/downloads/Reporte_Lote_${batchId}.pdf`;
}

export async function getAllBatches(): Promise<Batch[]> {
  if (isTauri) {
    try {
      return await invoke<Batch[]>('get_all_batches');
    } catch (error) {
      console.warn("get_all_batches IPC failed, falling back to mock", error);
    }
  }
  const batches = JSON.parse(safeGetItem('chil_batches') || '[]');
  return batches;
}

export async function getBatchById(id: number): Promise<Batch | null> {
  if (isTauri) {
    try {
      interface RustBatchDetails {
        batch: Batch;
      }
      const details = await invoke<RustBatchDetails | null>('get_batch_details', { batchId: id });
      return details ? details.batch : null;
    } catch (error) {
      console.warn("get_batch_details IPC failed, falling back to mock", error);
    }
  }
  const batches = await getAllBatches();
  return batches.find(b => b.id === id) || null;
}

export interface ScraperCredentials {
  email: string;
  password: string;
}

export async function saveScraperCredentials(credentials: ScraperCredentials): Promise<void> {
  if (isTauri) {
    await invoke('save_scraper_credentials', { credentials });
  } else {
    safeSetItem('chil_scraper_credentials', JSON.stringify(credentials));
  }
}

export async function hasScraperCredentials(): Promise<boolean> {
  if (isTauri) {
    try {
      return await invoke<boolean>('has_scraper_credentials');
    } catch (e) {
      console.warn("Failed to check if scraper credentials exist", e);
      return false;
    }
  }
  return safeGetItem('chil_scraper_credentials') !== null;
}

export async function loginScraper(): Promise<void> {
  if (isTauri) {
    await invoke('login_scraper');
  } else {
    // Simulator mock login delay
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

