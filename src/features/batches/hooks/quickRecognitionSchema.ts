import { z } from 'zod';
import { ScoutUnit } from '../types';

export interface QuickRecognitionValidationParams {
  recognitionType: string;
  unit: ScoutUnit;
  regionId: string;
  districtId: string;
  groupId: string;
  identity: string;
  scraperStatus: 'idle' | 'success' | 'error';
  verifiedCedula: string | null;
  firstNames: string;
  lastNames: string;
  recognitionCode: string;
}

export const quickRecognitionSchema = z
  .object({
    recognitionType: z.string().min(1, 'Debe seleccionar un tipo de reconocimiento'),
    unit: z.enum(['manada', 'tropa', 'caminantes', 'clan', 'institucional', 'no_scout']),
    regionId: z.string(),
    districtId: z.string(),
    groupId: z.string(),
    identity: z.string(),
    scraperStatus: z.enum(['idle', 'success', 'error']),
    verifiedCedula: z.string().nullable(),
    firstNames: z.string(),
    lastNames: z.string(),
    recognitionCode: z.string()
  })
  .superRefine((data, ctx) => {
    const isNoScout = data.unit === 'no_scout';

    if (!isNoScout) {
      if (!data.regionId && data.regionId !== '0') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Debe seleccionar una región',
          path: ['regionId']
        });
      }
      if (!data.districtId && data.districtId !== '0') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Debe seleccionar un distrito',
          path: ['districtId']
        });
      }
      if (!data.groupId && data.groupId !== '0') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Debe seleccionar un grupo scout',
          path: ['groupId']
        });
      }
    }

    const cleanIdentity = data.identity.trim();
    if (!cleanIdentity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe ingresar la cédula de identidad',
        path: ['identity']
      });
    } else if (!isNoScout && (data.scraperStatus !== 'success' || data.verifiedCedula !== cleanIdentity)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Debe consultar el sistema de registro para verificar la cédula del scout antes de emitir el reconocimiento.',
        path: ['identity']
      });
    }

    if (!data.firstNames.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe ingresar el o los nombres',
        path: ['firstNames']
      });
    }

    if (!data.lastNames.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe ingresar el o los apellidos',
        path: ['lastNames']
      });
    }

    if (!data.recognitionCode.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe generar o ingresar un código de reconocimiento',
        path: ['recognitionCode']
      });
    }
  });

export type QuickRecognitionSchemaData = z.infer<typeof quickRecognitionSchema>;

export function validateQuickRecognitionFields(
  params: QuickRecognitionValidationParams
): Record<string, string> {
  const result = quickRecognitionSchema.safeParse(params);
  if (result.success) {
    return {};
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? '');
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}
