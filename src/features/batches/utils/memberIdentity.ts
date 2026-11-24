import { ScoutMember } from '../types';

const NUMERIC_CEDULA_PATTERN = /^(?:[VEJGP]-?)?\d[\d.\-\s]*$/i;

export function isGenericIdentity(id?: string): boolean {
  if (!id) return true;
  const clean = id.trim().toUpperCase();
  return (
    clean === '' ||
    clean === 'S/C' ||
    clean === 'N/A' ||
    clean === 'NO_DISPONIBLE' ||
    clean === 'SIN CEDULA' ||
    clean === 'NONE'
  );
}

export function hasInvalidDocPathChars(raw?: string): boolean {
  if (!raw) return false;
  return raw.trim().includes('/');
}

export function normalizeCedula(raw?: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (isGenericIdentity(trimmed)) {
    return trimmed.toUpperCase();
  }
  if (NUMERIC_CEDULA_PATTERN.test(trimmed)) {
    return trimmed.replace(/\D/g, '');
  }
  return trimmed.toUpperCase();
}

export function isSameIdentity(a?: string, b?: string): boolean {
  if (isGenericIdentity(a) || isGenericIdentity(b)) {
    return false;
  }
  return normalizeCedula(a) === normalizeCedula(b);
}

export function getMemberDocId(
  member: Pick<ScoutMember, 'identity' | 'batch_id' | 'recognition_code'> &
    Partial<Pick<ScoutMember, 'first_names' | 'last_names'>>
): string {
  const hasValidBatchId = member.batch_id !== undefined && !Number.isNaN(member.batch_id);
  const batchPrefix = hasValidBatchId ? `${member.batch_id}_` : '';
  const cleanId = member.identity?.trim() ?? '';

  if (!isGenericIdentity(cleanId)) {
    return `${batchPrefix}${cleanId}`;
  }

  const cleanCode = member.recognition_code?.trim() ?? '';
  if (cleanCode !== '') {
    return `${batchPrefix}${cleanCode}`;
  }

  const nameParts = `${member.first_names ?? ''}_${member.last_names ?? ''}`
    .trim()
    .replace(/\s+/g, '_')
    .toUpperCase();
  if (nameParts && nameParts !== '_') {
    return `${batchPrefix}SC_${nameParts}`;
  }

  return `${batchPrefix}SC`;
}
