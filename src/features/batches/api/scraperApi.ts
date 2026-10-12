import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../lib/firebase';

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
    throw new Error(err?.message ?? "Credenciales incorrectas o inicio de sesión fallido", { cause: error });
  }
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
    throw new Error(err?.message ?? "Error de red", { cause: error });
  }
}
