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

export * from './imageProcessor';


