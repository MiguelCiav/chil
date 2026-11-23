import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  deleteField,
  writeBatch,
  query,
  where
} from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { createKeyedSessionCache } from '../../../lib/sessionCache';
import {
  RecognitionType,
  CreateRecognitionTypeParams,
  UpdateRecognitionTypeParams,
  CertificateTemplate
} from '../types';

export const MAX_FIRESTORE_TEMPLATE_BYTES = 950_000;

const recognitionTypesByUserCache = createKeyedSessionCache<string, RecognitionType[]>();
const recognitionTemplatesByIdCache = createKeyedSessionCache<string, CertificateTemplate | null>();

function sortRecognitionTypes(items: RecognitionType[]): RecognitionType[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
}

function findCachedRecognitionCatalogById(id: string): RecognitionType | null {
  for (const list of recognitionTypesByUserCache.values()) {
    const found = list.find((item) => item.id === id);
    if (found) {
      return found;
    }
  }
  return null;
}

function upsertRecognitionTypeInCache(item: RecognitionType, userId?: string): void {
  const targetUserId = item.user_id ?? userId ?? auth.currentUser?.uid ?? '';
  if (targetUserId && recognitionTypesByUserCache.has(targetUserId)) {
    const existing = recognitionTypesByUserCache.get(targetUserId) ?? [];
    const filtered = existing.filter((r) => r.id !== item.id);
    recognitionTypesByUserCache.set(targetUserId, sortRecognitionTypes([...filtered, item]));
    return;
  }

  for (const [uid, list] of recognitionTypesByUserCache.entries()) {
    if (list.some((r) => r.id === item.id)) {
      const updated = list.map((r) => (r.id === item.id ? item : r));
      recognitionTypesByUserCache.set(uid, sortRecognitionTypes(updated));
    }
  }
}

function removeRecognitionTypeFromCache(id: string): void {
  recognitionTemplatesByIdCache.delete(id);
  for (const [uid, list] of recognitionTypesByUserCache.entries()) {
    const filtered = list.filter((r) => r.id !== id);
    if (filtered.length !== list.length) {
      recognitionTypesByUserCache.set(uid, filtered);
    }
  }
}

async function migrateLegacyTemplateIfNeeded(
  recognitionId: string,
  template: CertificateTemplate
): Promise<void> {
  const batch = writeBatch(db);
  batch.set(
    doc(db, 'recognition_templates', recognitionId),
    { template, updated_at: new Date().toISOString() },
    { merge: true }
  );
  batch.set(
    doc(db, 'recognition_types', recognitionId),
    { template: deleteField() },
    { merge: true }
  );
  await batch.commit();
}

export function generateRecognitionId(name: string): string {
  const normalized = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9_-]/g, '-') // replace non-alphanumeric with hyphen
    .replace(/-+/g, '-') // collapse consecutive hyphens
    .replace(/^-/, '')
    .replace(/-$/, ''); // trim leading/trailing hyphens

  return `sct-${normalized || 'custom'}`;
}

export async function getAllRecognitionTypes(userId?: string): Promise<RecognitionType[]> {
  try {
    const targetUserId = userId ?? auth.currentUser?.uid ?? '';
    if (!targetUserId) {
      return [];
    }

    return await recognitionTypesByUserCache.getOrLoad(targetUserId, async () => {
      const q = query(collection(db, 'recognition_types'), where('user_id', '==', targetUserId));
      const snap = await getDocs(q);
      if (snap.empty || snap.docs.length === 0) {
        return [];
      }

      const items: RecognitionType[] = snap.docs.map((d) => {
        const data = d.data() as Omit<RecognitionType, 'id'>;
        if (data.template) {
          recognitionTemplatesByIdCache.set(d.id, data.template);
          void migrateLegacyTemplateIfNeeded(d.id, data.template).catch((err) => {
            console.warn(`Failed to lazily migrate legacy template for ${d.id}:`, err);
          });
        }
        return {
          id: d.id,
          name: data.name || d.id,
          created_at: data.created_at || new Date().toISOString(),
          ...(data.user_id ? { user_id: data.user_id } : {}),
          ...(data.template ? { template: data.template } : {})
        };
      });

      return sortRecognitionTypes(items);
    });
  } catch (error) {
    console.error('Failed to fetch recognition types from Firestore:', error);
    return [];
  }
}

export async function getRecognitionTypeById(id: string): Promise<RecognitionType | null> {
  try {
    let baseRecord = findCachedRecognitionCatalogById(id);
    let legacyTemplateFromDoc: CertificateTemplate | undefined = baseRecord?.template;

    if (!baseRecord) {
      const docRef = doc(db, 'recognition_types', id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        return null;
      }
      const data = snap.data() as Omit<RecognitionType, 'id'>;
      legacyTemplateFromDoc = data.template;
      baseRecord = {
        id: snap.id,
        name: data.name || snap.id,
        created_at: data.created_at || new Date().toISOString(),
        ...(data.user_id ? { user_id: data.user_id } : {})
      };
    }

    const template = await recognitionTemplatesByIdCache.getOrLoad(id, async () => {
      const templateSnap = await getDoc(doc(db, 'recognition_templates', id));
      if (templateSnap && templateSnap.exists()) {
        const templateData = templateSnap.data() as { template?: CertificateTemplate } | undefined;
        if (templateData?.template) {
          return templateData.template;
        }
      }
      if (legacyTemplateFromDoc) {
        void migrateLegacyTemplateIfNeeded(id, legacyTemplateFromDoc).catch((err) => {
          console.warn(`Failed to lazily migrate legacy template for ${id}:`, err);
        });
        return legacyTemplateFromDoc;
      }
      return null;
    });

    return {
      ...baseRecord,
      ...(template ? { template } : {})
    };
  } catch (error) {
    console.error(`Failed to fetch recognition type ${id}:`, error);
    return null;
  }
}

export async function createRecognitionType(
  data: CreateRecognitionTypeParams,
  userId?: string
): Promise<RecognitionType> {
  const id = generateRecognitionId(data.name);
  const targetUserId = data.user_id ?? userId ?? auth.currentUser?.uid ?? '';
  const newRecognition: RecognitionType = {
    id,
    name: data.name.trim(),
    created_at: new Date().toISOString(),
    ...(targetUserId ? { user_id: targetUserId } : {})
  };

  await setDoc(doc(db, 'recognition_types', id), newRecognition);
  upsertRecognitionTypeInCache(newRecognition, targetUserId);
  return newRecognition;
}

export async function updateRecognitionType(
  id: string,
  data: UpdateRecognitionTypeParams,
  userId?: string
): Promise<RecognitionType> {
  const cached = findCachedRecognitionCatalogById(id);
  const targetUserId = userId ?? cached?.user_id ?? auth.currentUser?.uid ?? '';
  const createdAt = cached?.created_at ?? new Date().toISOString();
  const catalogUpdate: RecognitionType = {
    id,
    name: data.name.trim(),
    created_at: createdAt,
    ...(targetUserId ? { user_id: targetUserId } : {})
  };

  await setDoc(doc(db, 'recognition_types', id), catalogUpdate, { merge: true });

  const cachedTemplate = recognitionTemplatesByIdCache.get(id) ?? cached?.template;
  const updated: RecognitionType = {
    ...catalogUpdate,
    ...(cachedTemplate ? { template: cachedTemplate } : {})
  };
  upsertRecognitionTypeInCache(updated, targetUserId);
  return updated;
}

export async function deleteRecognitionType(id: string): Promise<void> {
  await deleteDoc(doc(db, 'recognition_types', id));
  try {
    await deleteDoc(doc(db, 'recognition_templates', id));
  } catch {
    // Ignore if decoupled template document does not exist
  }
  removeRecognitionTypeFromCache(id);
}

export async function saveCertificateTemplate(
  recognitionId: string,
  template: CertificateTemplate
): Promise<void> {
  if (
    template.background_url &&
    template.background_url.length > MAX_FIRESTORE_TEMPLATE_BYTES
  ) {
    throw new Error(
      'La imagen de fondo excede el límite máximo de almacenamiento permitido (1 MB). Por favor suba una imagen más ligera.'
    );
  }
  await migrateLegacyTemplateIfNeeded(recognitionId, template);
  recognitionTemplatesByIdCache.set(recognitionId, template);

  const cached = findCachedRecognitionCatalogById(recognitionId);
  if (cached) {
    upsertRecognitionTypeInCache({ ...cached, template }, cached.user_id);
  }
}

export * from './imageProcessor';
