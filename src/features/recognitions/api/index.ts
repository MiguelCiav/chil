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
  deletePersistentEntry,
  getPersistentEntry,
  setPersistentEntry
} from '../../../lib/persistentCache';
import {
  RecognitionType,
  CreateRecognitionTypeParams,
  UpdateRecognitionTypeParams,
  CertificateTemplate
} from '../types';

export const MAX_FIRESTORE_TEMPLATE_BYTES = 950_000;

const recognitionTypesByUserCache = createKeyedSessionCache<string, RecognitionType[]>();
const coldRecognitionTypeByIdCache = createKeyedSessionCache<string, RecognitionType | null>();
const recognitionTemplatesByIdCache = createKeyedSessionCache<string, CertificateTemplate | null>();

interface PersistedTemplateWrapper {
  template: CertificateTemplate | null;
}

interface PersistedColdRecordWrapper {
  record: RecognitionType | null;
}

function getCatalogPersistentKey(uid: string): string {
  return `recognition_types:${uid}`;
}

function getColdRecordPersistentKey(id: string): string {
  return `recognition_type:${id}`;
}

function getTemplatePersistentKey(id: string): string {
  return `recognition_template:${id}`;
}

function stripTemplateForCatalog(item: RecognitionType): RecognitionType {
  return {
    id: item.id,
    name: item.name,
    created_at: item.created_at,
    ...(item.user_id ? { user_id: item.user_id } : {})
  };
}

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

async function persistCatalogSnapshot(
  uid: string,
  items: RecognitionType[],
  notifyTabs = true
): Promise<void> {
  if (!uid) return;
  await setPersistentEntry(
    getCatalogPersistentKey(uid),
    uid,
    items.map(stripTemplateForCatalog),
    undefined,
    notifyTabs
  );
}

async function upsertRecognitionTypeInCache(
  item: RecognitionType,
  userId?: string
): Promise<void> {
  coldRecognitionTypeByIdCache.set(item.id, item);

  const targetUserId = item.user_id ?? userId ?? auth.currentUser?.uid ?? '';
  if (targetUserId && recognitionTypesByUserCache.has(targetUserId)) {
    const existing = recognitionTypesByUserCache.get(targetUserId) ?? [];
    const filtered = existing.filter((r) => r.id !== item.id);
    const next = sortRecognitionTypes([...filtered, item]);
    recognitionTypesByUserCache.set(targetUserId, next);
    await persistCatalogSnapshot(targetUserId, next);
    await setPersistentEntry<PersistedColdRecordWrapper>(
      getColdRecordPersistentKey(item.id),
      targetUserId,
      { record: stripTemplateForCatalog(item) },
      undefined,
      false
    );
    return;
  }

  const persistedUids: string[] = [];
  for (const [uid, list] of recognitionTypesByUserCache.entries()) {
    if (list.some((r) => r.id === item.id)) {
      const updated = sortRecognitionTypes(list.map((r) => (r.id === item.id ? item : r)));
      recognitionTypesByUserCache.set(uid, updated);
      persistedUids.push(uid);
    }
  }
  for (const uid of persistedUids) {
    const list = recognitionTypesByUserCache.get(uid);
    if (list) {
      await persistCatalogSnapshot(uid, list);
    }
  }

  let updatedPersistedCatalog = false;
  if (targetUserId && persistedUids.length === 0 && !recognitionTypesByUserCache.has(targetUserId)) {
    const persisted = await getPersistentEntry<RecognitionType[]>(
      getCatalogPersistentKey(targetUserId)
    );
    if (Array.isArray(persisted)) {
      const filtered = persisted.filter((r) => r.id !== item.id);
      const next = sortRecognitionTypes([...filtered, stripTemplateForCatalog(item)]);
      await persistCatalogSnapshot(targetUserId, next);
      updatedPersistedCatalog = true;
    }
  }

  await setPersistentEntry<PersistedColdRecordWrapper>(
    getColdRecordPersistentKey(item.id),
    targetUserId,
    { record: stripTemplateForCatalog(item) },
    undefined,
    !updatedPersistedCatalog && persistedUids.length === 0
  );
}

async function removeRecognitionTypeFromCache(id: string, userId?: string): Promise<void> {
  recognitionTemplatesByIdCache.delete(id);
  coldRecognitionTypeByIdCache.delete(id);

  const persistedUids = new Set<string>();
  for (const [uid, list] of recognitionTypesByUserCache.entries()) {
    const filtered = list.filter((r) => r.id !== id);
    if (filtered.length !== list.length) {
      recognitionTypesByUserCache.set(uid, filtered);
      persistedUids.add(uid);
    }
  }

  for (const uid of persistedUids) {
    const list = recognitionTypesByUserCache.get(uid);
    if (list) {
      await persistCatalogSnapshot(uid, list);
    }
  }

  const targetUserId = userId ?? auth.currentUser?.uid ?? '';
  if (
    targetUserId &&
    !persistedUids.has(targetUserId) &&
    !recognitionTypesByUserCache.has(targetUserId)
  ) {
    const persisted = await getPersistentEntry<RecognitionType[]>(
      getCatalogPersistentKey(targetUserId)
    );
    if (Array.isArray(persisted)) {
      const filtered = persisted.filter((r) => r.id !== id);
      if (filtered.length !== persisted.length) {
        await persistCatalogSnapshot(targetUserId, filtered);
      }
    }
  }

  await deletePersistentEntry(getColdRecordPersistentKey(id), targetUserId);
  await deletePersistentEntry(getTemplatePersistentKey(id), targetUserId);
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
      const persisted = await getPersistentEntry<RecognitionType[]>(
        getCatalogPersistentKey(targetUserId)
      );
      if (Array.isArray(persisted)) {
        return sortRecognitionTypes(persisted);
      }

      const q = query(collection(db, 'recognition_types'), where('user_id', '==', targetUserId));
      const snap = await getDocs(q);
      if (snap.empty || snap.docs.length === 0) {
        await persistCatalogSnapshot(targetUserId, [], false);
        return [];
      }

      const legacyPersistPromises: Promise<void>[] = [];
      const items: RecognitionType[] = snap.docs.map((d) => {
        const data = d.data() as Omit<RecognitionType, 'id'>;
        if (data.template) {
          recognitionTemplatesByIdCache.set(d.id, data.template);
          legacyPersistPromises.push(
            setPersistentEntry<PersistedTemplateWrapper>(
              getTemplatePersistentKey(d.id),
              targetUserId,
              { template: data.template },
              undefined,
              false
            )
          );
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

      const sorted = sortRecognitionTypes(items);
      await Promise.all([
        ...legacyPersistPromises,
        persistCatalogSnapshot(targetUserId, sorted, false)
      ]);
      return sorted;
    });
  } catch (error) {
    console.error('Failed to fetch recognition types from Firestore:', error);
    return [];
  }
}

export async function getRecognitionTypeById(id: string): Promise<RecognitionType | null> {
  try {
    let baseRecord = findCachedRecognitionCatalogById(id);
    const currentUid = auth.currentUser?.uid ?? '';

    if (!baseRecord && coldRecognitionTypeByIdCache.has(id)) {
      const coldCached = coldRecognitionTypeByIdCache.get(id) ?? null;
      if (!coldCached) {
        return null;
      }
      baseRecord = coldCached;
    }

    if (!baseRecord && currentUid) {
      const inFlightCatalog = recognitionTypesByUserCache.getInFlight(currentUid);
      if (inFlightCatalog) {
        const list = await inFlightCatalog;
        baseRecord = list.find((item) => item.id === id) ?? null;
      } else if (!recognitionTypesByUserCache.has(currentUid)) {
        const persisted = await getPersistentEntry<RecognitionType[]>(
          getCatalogPersistentKey(currentUid)
        );
        if (Array.isArray(persisted)) {
          const sorted = sortRecognitionTypes(persisted);
          recognitionTypesByUserCache.set(currentUid, sorted);
          baseRecord = sorted.find((item) => item.id === id) ?? null;
        }
      }
    }

    let legacyTemplateFromDoc: CertificateTemplate | undefined = baseRecord?.template;

    if (!baseRecord) {
      baseRecord = await coldRecognitionTypeByIdCache.getOrLoad(id, async () => {
        const persistedCold = await getPersistentEntry<PersistedColdRecordWrapper>(
          getColdRecordPersistentKey(id)
        );
        if (persistedCold && 'record' in persistedCold) {
          return persistedCold.record;
        }

        const docRef = doc(db, 'recognition_types', id);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          await setPersistentEntry<PersistedColdRecordWrapper>(
            getColdRecordPersistentKey(id),
            currentUid,
            { record: null },
            undefined,
            false
          );
          return null;
        }
        const data = snap.data() as Omit<RecognitionType, 'id'>;
        const record: RecognitionType = {
          id: snap.id,
          name: data.name || snap.id,
          created_at: data.created_at || new Date().toISOString(),
          ...(data.user_id ? { user_id: data.user_id } : {}),
          ...(data.template ? { template: data.template } : {})
        };
        await setPersistentEntry<PersistedColdRecordWrapper>(
          getColdRecordPersistentKey(id),
          record.user_id ?? currentUid,
          { record: stripTemplateForCatalog(record) },
          undefined,
          false
        );
        return record;
      });
      if (!baseRecord) {
        return null;
      }
      legacyTemplateFromDoc = baseRecord.template;
    }

    const templateUid = baseRecord.user_id ?? currentUid;
    const template = await recognitionTemplatesByIdCache.getOrLoad(id, async () => {
      const persistedTemplate = await getPersistentEntry<PersistedTemplateWrapper>(
        getTemplatePersistentKey(id)
      );
      if (persistedTemplate && 'template' in persistedTemplate) {
        return persistedTemplate.template;
      }

      try {
        const templateSnap = await getDoc(doc(db, 'recognition_templates', id));
        if (templateSnap && templateSnap.exists()) {
          const templateData = templateSnap.data() as { template?: CertificateTemplate } | undefined;
          if (templateData?.template) {
            await setPersistentEntry<PersistedTemplateWrapper>(
              getTemplatePersistentKey(id),
              templateUid,
              { template: templateData.template },
              undefined,
              false
            );
            return templateData.template;
          }
        }
      } catch (templateErr) {
        console.warn(`Failed to fetch decoupled template for ${id}, falling back:`, templateErr);
        return legacyTemplateFromDoc ?? null;
      }

      if (legacyTemplateFromDoc) {
        void migrateLegacyTemplateIfNeeded(id, legacyTemplateFromDoc).catch((err) => {
          console.warn(`Failed to lazily migrate legacy template for ${id}:`, err);
        });
        await setPersistentEntry<PersistedTemplateWrapper>(
          getTemplatePersistentKey(id),
          templateUid,
          { template: legacyTemplateFromDoc },
          undefined,
          false
        );
        return legacyTemplateFromDoc;
      }

      await setPersistentEntry<PersistedTemplateWrapper>(
        getTemplatePersistentKey(id),
        templateUid,
        { template: null },
        undefined,
        false
      );
      return null;
    });

    return {
      ...stripTemplateForCatalog(baseRecord),
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
  recognitionTemplatesByIdCache.set(id, null);
  await setPersistentEntry<PersistedTemplateWrapper>(
    getTemplatePersistentKey(id),
    targetUserId,
    { template: null }
  );
  await upsertRecognitionTypeInCache(newRecognition, targetUserId);
  return newRecognition;
}

export async function updateRecognitionType(
  id: string,
  data: UpdateRecognitionTypeParams,
  userId?: string
): Promise<RecognitionType> {
  let cached = findCachedRecognitionCatalogById(id) ?? coldRecognitionTypeByIdCache.get(id) ?? null;
  const fallbackUid = userId ?? cached?.user_id ?? auth.currentUser?.uid ?? '';

  if (!cached && fallbackUid) {
    const persistedCatalog = await getPersistentEntry<RecognitionType[]>(
      getCatalogPersistentKey(fallbackUid)
    );
    if (Array.isArray(persistedCatalog)) {
      cached = persistedCatalog.find((item) => item.id === id) ?? null;
    }
    if (!cached) {
      const persistedCold = await getPersistentEntry<PersistedColdRecordWrapper>(
        getColdRecordPersistentKey(id)
      );
      if (persistedCold?.record) {
        cached = persistedCold.record;
      }
    }
  }

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
  await upsertRecognitionTypeInCache(updated, targetUserId);
  return updated;
}

export async function deleteRecognitionType(id: string): Promise<void> {
  await deleteDoc(doc(db, 'recognition_types', id));
  try {
    await deleteDoc(doc(db, 'recognition_templates', id));
  } catch {
    // Ignore if decoupled template document does not exist
  }
  await removeRecognitionTypeFromCache(id);
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

  const cached =
    findCachedRecognitionCatalogById(recognitionId) ??
    coldRecognitionTypeByIdCache.get(recognitionId);
  const targetUserId = cached?.user_id ?? auth.currentUser?.uid ?? '';
  await setPersistentEntry<PersistedTemplateWrapper>(
    getTemplatePersistentKey(recognitionId),
    targetUserId,
    { template },
    undefined,
    !cached
  );

  if (cached) {
    await upsertRecognitionTypeInCache({ ...cached, template }, cached.user_id);
  }
}

export * from './imageProcessor';
