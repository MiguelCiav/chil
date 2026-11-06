import { z } from 'zod';
import { parseCedulasFromText } from './wizardHelpers';

export const step1DataLoadSchema = z.object({
  comment: z.string().optional(),
  recognitionType: z.string().min(1, 'Debe seleccionar un tipo de reconocimiento'),
  cedulas: z
    .string()
    .min(1, 'Debe ingresar al menos una cédula')
    .refine((val) => parseCedulasFromText(val).length > 0, {
      message: 'Ingrese al menos una cédula válida (solo números)'
    })
});

export type Step1DataLoadFormData = z.infer<typeof step1DataLoadSchema>;

// Backwards compatibility alias
export const step1Schema = step1DataLoadSchema;
export type Step1FormData = Step1DataLoadFormData;
