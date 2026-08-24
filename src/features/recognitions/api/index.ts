import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import {
  RecognitionType,
  CreateRecognitionTypeParams,
  UpdateRecognitionTypeParams,
  CertificateTemplate
} from '../types';

export function generateRecognitionId(name: string): string {
  const normalized = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, '-') // replace non-alphanumeric with hyphen
    .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens

  return `sct-${normalized || 'custom'}`;
}

export async function getAllRecognitionTypes(): Promise<RecognitionType[]> {
  try {
    const snap = await getDocs(collection(db, 'recognition_types'));
    if (snap.empty || snap.docs.length === 0) {
      return [];
    }

    const items: RecognitionType[] = snap.docs.map(d => {
      const data = d.data() as Omit<RecognitionType, 'id'>;
      return {
        id: d.id,
        name: data.name || d.id,
        created_at: data.created_at || new Date().toISOString(),
        ...(data.template ? { template: data.template } : {})
      };
    });

    items.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    return items;
  } catch (error) {
    console.error('Failed to fetch recognition types from Firestore:', error);
    return [];
  }
}

export async function getRecognitionTypeById(id: string): Promise<RecognitionType | null> {
  try {
    const docRef = doc(db, 'recognition_types', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data() as Omit<RecognitionType, 'id'>;
    return {
      id: snap.id,
      name: data.name || snap.id,
      created_at: data.created_at || new Date().toISOString(),
      ...(data.template ? { template: data.template } : {})
    };
  } catch (error) {
    console.error(`Failed to fetch recognition type ${id}:`, error);
    return null;
  }
}

export async function createRecognitionType(data: CreateRecognitionTypeParams): Promise<RecognitionType> {
  const id = generateRecognitionId(data.name);
  const newRecognition: RecognitionType = {
    id,
    name: data.name.trim(),
    created_at: new Date().toISOString()
  };

  await setDoc(doc(db, 'recognition_types', id), newRecognition);
  return newRecognition;
}

export async function updateRecognitionType(id: string, data: UpdateRecognitionTypeParams): Promise<RecognitionType> {
  const existing = await getRecognitionTypeById(id);
  const updated: RecognitionType = {
    id,
    name: data.name.trim(),
    created_at: existing?.created_at || new Date().toISOString(),
    ...(existing?.template ? { template: existing.template } : {})
  };

  await setDoc(doc(db, 'recognition_types', id), updated);
  return updated;
}

export async function deleteRecognitionType(id: string): Promise<void> {
  await deleteDoc(doc(db, 'recognition_types', id));
}

export async function saveCertificateTemplate(
  recognitionId: string,
  template: CertificateTemplate
): Promise<void> {
  const docRef = doc(db, 'recognition_types', recognitionId);
  await setDoc(docRef, { template }, { merge: true });
}

export interface ProcessedBackgroundResult {
  dataUrl: string;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  normalizedWidth: number;
  normalizedHeight: number;
  aspectRatio: number;
  orientation: 'landscape' | 'portrait';
}

export async function processBackgroundImageFile(
  file: File,
  maxWidth = 1920,
  maxHeight = 1440
): Promise<ProcessedBackgroundResult> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve({
          dataUrl,
          width: 297,
          height: 210,
          naturalWidth: 297,
          naturalHeight: 210,
          normalizedWidth: 297,
          normalizedHeight: 210,
          aspectRatio: Math.round((297 / 210) * 1000) / 1000,
          orientation: 'landscape'
        });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      if (typeof Image === 'undefined' || typeof document === 'undefined') {
        resolve({
          dataUrl: rawDataUrl,
          width: 297,
          height: 210,
          naturalWidth: 297,
          naturalHeight: 210,
          normalizedWidth: 297,
          normalizedHeight: 210,
          aspectRatio: Math.round((297 / 210) * 1000) / 1000,
          orientation: 'landscape'
        });
        return;
      }

      try {
        const img = new Image();
        let isDone = false;

        // Fallback for headless environments (jsdom) where Image decoding doesn't fire load/error events
        const timer = setTimeout(() => {
          if (!isDone) {
            isDone = true;
            resolve({
              dataUrl: rawDataUrl,
              width: 297,
              height: 210,
              naturalWidth: 297,
              naturalHeight: 210,
              normalizedWidth: 297,
              normalizedHeight: 210,
              aspectRatio: Math.round((297 / 210) * 1000) / 1000,
              orientation: 'landscape'
            });
          }
        }, 100);

        img.onload = () => {
          if (isDone) return;
          isDone = true;
          clearTimeout(timer);

          const naturalWidth = img.naturalWidth || img.width || 1920;
          const naturalHeight = img.naturalHeight || img.height || 1080;
          const aspectRatio = Math.round((naturalWidth / naturalHeight) * 1000) / 1000;
          const orientation: 'landscape' | 'portrait' = naturalWidth >= naturalHeight ? 'landscape' : 'portrait';

          let normalizedWidth: number;
          let normalizedHeight: number;
          if (orientation === 'landscape') {
            normalizedWidth = 297;
            normalizedHeight = Math.round((297 / (naturalWidth / naturalHeight)) * 100) / 100;
          } else {
            normalizedHeight = 297;
            normalizedWidth = Math.round((297 * (naturalWidth / naturalHeight)) * 100) / 100;
          }

          let width = naturalWidth;
          let height = naturalHeight;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({
              dataUrl: rawDataUrl,
              width: naturalWidth,
              height: naturalHeight,
              naturalWidth,
              naturalHeight,
              normalizedWidth,
              normalizedHeight,
              aspectRatio,
              orientation
            });
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          try {
            const webpData = canvas.toDataURL('image/webp', 0.88);
            if (webpData && webpData.startsWith('data:image/webp')) {
              resolve({
                dataUrl: webpData,
                width: naturalWidth,
                height: naturalHeight,
                naturalWidth,
                naturalHeight,
                normalizedWidth,
                normalizedHeight,
                aspectRatio,
                orientation
              });
              return;
            }
          } catch {
            // Fallback if webp unsupported
          }
          resolve({
            dataUrl: canvas.toDataURL('image/jpeg', 0.88),
            width: naturalWidth,
            height: naturalHeight,
            naturalWidth,
            naturalHeight,
            normalizedWidth,
            normalizedHeight,
            aspectRatio,
            orientation
          });
        };

        img.onerror = () => {
          if (isDone) return;
          isDone = true;
          clearTimeout(timer);
          resolve({
            dataUrl: rawDataUrl,
            width: 297,
            height: 210,
            naturalWidth: 297,
            naturalHeight: 210,
            normalizedWidth: 297,
            normalizedHeight: 210,
            aspectRatio: Math.round((297 / 210) * 1000) / 1000,
            orientation: 'landscape'
          });
        };

        img.src = rawDataUrl;
      } catch {
        resolve({
          dataUrl: rawDataUrl,
          width: 297,
          height: 210,
          naturalWidth: 297,
          naturalHeight: 210,
          normalizedWidth: 297,
          normalizedHeight: 210,
          aspectRatio: Math.round((297 / 210) * 1000) / 1000,
          orientation: 'landscape'
        });
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

