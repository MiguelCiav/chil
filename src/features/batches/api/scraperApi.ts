import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../../../lib/firebase';

export const getScraperApiUrl = (): string => {
  const rawApiUrl = (
    import.meta.env.VITE_SCRAPER_API_URL as string | undefined
  )?.trim();
  return rawApiUrl ? rawApiUrl.replace(/\/+$/, '') : '';
};

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

export type ScraperSessionStatusState = 'active' | 'expired' | 'none';

export interface ScraperSessionStatus {
  connected: boolean;
  status: ScraperSessionStatusState;
  impeesaEmail: string | null;
  updatedAt: string | null;
}

export type ScraperSessionErrorReason =
  | 'SCRAPER_NOT_CONFIGURED'
  | 'SCRAPER_SESSION_EXPIRED'
  | 'UNAUTHENTICATED';

export class ScraperSessionError extends Error {
  readonly reason: ScraperSessionErrorReason;

  constructor(
    reason: ScraperSessionErrorReason,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'ScraperSessionError';
    this.reason = reason;
  }
}

export function isScraperSessionError(
  error: unknown
): error is ScraperSessionError {
  return (
    error instanceof ScraperSessionError ||
    (typeof error === 'object' &&
      error !== null &&
      (error as { name?: string }).name === 'ScraperSessionError' &&
      typeof (error as { reason?: string }).reason === 'string')
  );
}

const LEGACY_SCRAPER_CREDENTIALS_KEY = 'chil_scraper_credentials';

export function purgeLegacyScraperStorage(): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(LEGACY_SCRAPER_CREDENTIALS_KEY);
    }
  } catch {
    // Ignore storage cleanup errors
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(LEGACY_SCRAPER_CREDENTIALS_KEY);
    }
  } catch {
    // Ignore storage cleanup errors
  }
}

interface CallableErrorLike {
  code?: string;
  message?: string;
  details?: { reason?: string } | unknown;
}

interface HttpErrorPayload {
  error?: string;
  reason?: string;
}

function mapCallableError(error: unknown, fallbackMessage: string): Error {
  if (isScraperSessionError(error)) {
    return error;
  }

  const errObj = (error ?? {}) as CallableErrorLike;
  const code = typeof errObj.code === 'string' ? errObj.code : '';
  const message =
    error instanceof Error && error.message
      ? error.message
      : typeof errObj.message === 'string' && errObj.message
        ? errObj.message
        : fallbackMessage;

  const detailsObj =
    typeof errObj.details === 'object' && errObj.details !== null
      ? (errObj.details as { reason?: string })
      : null;
  const reason = detailsObj?.reason;

  if (
    code.includes('failed-precondition') ||
    reason === 'SCRAPER_NOT_CONFIGURED' ||
    reason === 'SCRAPER_SESSION_EXPIRED'
  ) {
    const resolvedReason: ScraperSessionErrorReason =
      reason === 'SCRAPER_SESSION_EXPIRED' ||
      message.toLowerCase().includes('expir')
        ? 'SCRAPER_SESSION_EXPIRED'
        : 'SCRAPER_NOT_CONFIGURED';
    return new ScraperSessionError(resolvedReason, message, { cause: error });
  }

  if (code.includes('unauthenticated')) {
    return new ScraperSessionError('UNAUTHENTICATED', message, {
      cause: error,
    });
  }

  return new Error(message, { cause: error });
}

function mapHttpError(
  status: number,
  errData: HttpErrorPayload,
  fallbackMessage: string
): Error {
  const message = errData?.error || fallbackMessage;
  const reason = errData?.reason;

  if (
    status === 412 ||
    reason === 'SCRAPER_NOT_CONFIGURED' ||
    reason === 'SCRAPER_SESSION_EXPIRED'
  ) {
    const resolvedReason: ScraperSessionErrorReason =
      reason === 'SCRAPER_SESSION_EXPIRED' ||
      message.toLowerCase().includes('expir')
        ? 'SCRAPER_SESSION_EXPIRED'
        : 'SCRAPER_NOT_CONFIGURED';
    return new ScraperSessionError(resolvedReason, message);
  }

  if (status === 401) {
    if (reason === 'IMPEESA_INVALID_CREDENTIALS') {
      return new Error(message);
    }
    return new ScraperSessionError('UNAUTHENTICATED', message);
  }

  return new Error(message);
}

async function fetchScraperApi<TResponse>(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE',
  fallbackError: string,
  body?: unknown
): Promise<TResponse> {
  const baseUrl = getScraperApiUrl();
  const idToken = auth.currentUser
    ? await auth.currentUser.getIdToken()
    : null;

  if (!idToken) {
    throw new ScraperSessionError(
      'UNAUTHENTICATED',
      'Debes iniciar sesión en Chil para usar el scraper'
    );
  }

  const resp = await fetch(`${baseUrl}/${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!resp.ok) {
    const errData = (await resp.json().catch(() => ({}))) as HttpErrorPayload;
    throw mapHttpError(resp.status, errData, fallbackError);
  }

  return (await resp.json()) as TResponse;
}

async function callHttpEndpoint<TResponse>(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE',
  fallbackError: string,
  logContext: string,
  body?: unknown
): Promise<TResponse> {
  try {
    return await fetchScraperApi<TResponse>(
      endpoint,
      method,
      fallbackError,
      body
    );
  } catch (error: unknown) {
    console.error(logContext, error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(fallbackError, { cause: error });
  }
}

export async function getScraperSessionStatus(): Promise<ScraperSessionStatus> {
  purgeLegacyScraperStorage();

  if (getScraperApiUrl()) {
    return callHttpEndpoint<ScraperSessionStatus>(
      'getScraperSessionStatus',
      'GET',
      'No se pudo consultar el estado de la sesión del scraper',
      'Failed to fetch scraper session status:'
    );
  }

  try {
    const statusFn = httpsCallable<Record<string, never>, ScraperSessionStatus>(
      functions,
      'getScraperSessionStatus'
    );
    const result = await statusFn({});
    return result.data;
  } catch (error: unknown) {
    console.error('Failed to fetch scraper session status:', error);
    throw mapCallableError(
      error,
      'No se pudo consultar el estado de la sesión del scraper'
    );
  }
}

export async function saveScraperSession(
  credentials: ScraperCredentials
): Promise<ScraperSessionStatus> {
  purgeLegacyScraperStorage();

  if (getScraperApiUrl()) {
    return callHttpEndpoint<ScraperSessionStatus>(
      'saveScraperSession',
      'POST',
      'Credenciales incorrectas o inicio de sesión fallido',
      'Failed to save scraper session:',
      credentials
    );
  }

  try {
    const saveFn = httpsCallable<ScraperCredentials, ScraperSessionStatus>(
      functions,
      'saveScraperSession'
    );
    const result = await saveFn(credentials);
    return result.data;
  } catch (error: unknown) {
    console.error('Failed to save scraper session:', error);
    const errObj = (error ?? {}) as CallableErrorLike;
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Credenciales incorrectas o inicio de sesión fallido';
    if (
      typeof errObj.code === 'string' &&
      errObj.code.includes('unauthenticated')
    ) {
      throw new Error(message, { cause: error });
    }
    throw mapCallableError(
      error,
      'Credenciales incorrectas o inicio de sesión fallido'
    );
  }
}

export async function clearScraperSession(): Promise<ScraperSessionStatus> {
  purgeLegacyScraperStorage();

  if (getScraperApiUrl()) {
    return callHttpEndpoint<ScraperSessionStatus>(
      'clearScraperSession',
      'POST',
      'No se pudo desconectar la sesión del scraper',
      'Failed to clear scraper session:'
    );
  }

  try {
    const clearFn = httpsCallable<Record<string, never>, ScraperSessionStatus>(
      functions,
      'clearScraperSession'
    );
    const result = await clearFn({});
    return result.data;
  } catch (error: unknown) {
    console.error('Failed to clear scraper session:', error);
    throw mapCallableError(error, 'No se pudo desconectar la sesión del scraper');
  }
}

export async function getMemberStatus(
  cedula: string
): Promise<ScraperMemberDetails> {
  purgeLegacyScraperStorage();

  if (getScraperApiUrl()) {
    const result = await callHttpEndpoint<{ data: ScraperMemberDetails }>(
      'getMemberStatus',
      'POST',
      'Error de red',
      'Scraper function failed:',
      { cedula }
    );
    return result.data;
  }

  try {
    const getStatusFn = httpsCallable<{ cedula: string }, ScraperMemberDetails>(
      functions,
      'getMemberStatus'
    );
    const result = await getStatusFn({ cedula });
    return result.data;
  } catch (error: unknown) {
    console.error('Scraper function failed:', error);
    throw mapCallableError(error, 'Error de red');
  }
}
