import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../lib/firebase';

export interface ScraperMemberDetails {
  // Legacy Core Fields (100% Backwards Compatible)
  nombre_completo: string;
  status: string;
  telefono: string;
  correo_electronico: string;
  fecha_nacimiento: string;

  // Enhanced Identity & Verification
  cedula?: string;
  cedula_raw?: string;
  member_uuid?: string;
  avatar_url?: string;
  genero?: string;
  fecha_nacimiento_raw?: string;
  edad?: number | null;

  // Territorial Structure from Portal
  region?: string;
  distrito?: string;
  grupo?: string;

  // Scout Unit & Positions
  unidad?: string;
  cargo_grupo?: string;
  cargo_institucional?: string;
  tipo_miembro?: string;

  // Solvency & Scout History
  solvente_hasta?: string;
  solvente_hasta_raw?: string;
  progresion_actual?: string;
  fecha_ingreso?: string;
  fecha_promesa?: string;
  rol_sistema?: string;

  // Contact & Demographics
  correo_secundario?: string;
  ubicacion_estado?: string;
  direccion?: string;
  religion?: string;
  nivel_educativo?: string;
  ocupacion?: string;
  carnet_pdf_url?: string;
  medical_pdf_url?: string;
}

export interface ScraperCredentials {
  email: string;
  password: string;
}

const SCRAPER_CREDENTIALS_KEY = 'chil_scraper_credentials';

const safeGetItem = (key: string): string | null => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage.getItem(key);
    }
  } catch (e) {
    console.warn("Session storage item fetch failed", e);
  }
  return null;
};

const safeSetItem = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(key, value);
    }
  } catch (e) {
    console.warn("Session storage item write failed", e);
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore localStorage cleanup failure
  }
};

const safeRemoveItem = (key: string): void => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(key);
    }
  } catch (e) {
    console.warn("Session storage item removal failed", e);
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore localStorage cleanup failure
  }
};

export function getScraperCredentials(): ScraperCredentials | null {
  const credentialsJson = safeGetItem(SCRAPER_CREDENTIALS_KEY);
  if (!credentialsJson) {
    return null;
  }
  try {
    const parsed = JSON.parse(credentialsJson) as Partial<ScraperCredentials>;
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.email === 'string' &&
      typeof parsed.password === 'string'
    ) {
      return {
        email: parsed.email,
        password: parsed.password
      };
    }
    return null;
  } catch (e) {
    console.warn("Failed to parse scraper credentials from sessionStorage:", e);
    safeRemoveItem(SCRAPER_CREDENTIALS_KEY);
    return null;
  }
}

export async function clearScraperCredentials(): Promise<void> {
  safeRemoveItem(SCRAPER_CREDENTIALS_KEY);
}

export async function saveScraperCredentials(credentials: ScraperCredentials): Promise<void> {
  safeSetItem(SCRAPER_CREDENTIALS_KEY, JSON.stringify(credentials));
}

export async function hasScraperCredentials(): Promise<boolean> {
  return getScraperCredentials() !== null;
}

export async function loginScraper(): Promise<void> {
  const credentials = getScraperCredentials();
  if (!credentials) {
    throw new Error("No hay credenciales configuradas");
  }

  try {
    const loginFn = httpsCallable<{ credentials: ScraperCredentials }, void>(
      functions,
      'loginScraper'
    );
    await loginFn({ credentials });
  } catch (error: unknown) {
    console.error("Scraper login failed:", error);
    const err = error as Error;
    throw new Error(err?.message ?? "Credenciales incorrectas o inicio de sesión fallido", { cause: error });
  }
}

export async function getMemberStatus(cedula: string): Promise<ScraperMemberDetails> {
  const credentials = getScraperCredentials();

  try {
    const getStatusFn = httpsCallable<{ cedula: string; credentials?: ScraperCredentials | null }, ScraperMemberDetails>(
      functions,
      'getMemberStatus'
    );
    const result = await getStatusFn({ cedula, credentials });
    return result.data;
  } catch (error: unknown) {
    console.error("Scraper function failed:", error);
    const err = error as Error;
    throw new Error(err?.message ?? "Error de red", { cause: error });
  }
}
