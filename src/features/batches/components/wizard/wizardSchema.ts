import { z } from 'zod';

export const step1Schema = z
  .object({
    comment: z.string().optional(),
    regionId: z.string().optional(),
    districtId: z.string().optional(),
    groupId: z.string().optional(),
    recognitionType: z.string().min(1, 'Debe seleccionar un tipo de reconocimiento'),
    unitScope: z.string().optional()
  })
  .refine(
    (data) => data.unitScope === 'no_scout' || Boolean(data.regionId && data.regionId.trim() !== ''),
    {
      message: 'Debe seleccionar una región',
      path: ['regionId']
    }
  )
  .refine(
    (data) => data.unitScope === 'no_scout' || Boolean(data.districtId && data.districtId.trim() !== ''),
    {
      message: 'Debe seleccionar un distrito',
      path: ['districtId']
    }
  )
  .refine(
    (data) => data.unitScope === 'no_scout' || Boolean(data.groupId && data.groupId.trim() !== ''),
    {
      message: 'Debe seleccionar un grupo scout',
      path: ['groupId']
    }
  );

export type Step1FormData = z.infer<typeof step1Schema>;
