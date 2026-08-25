import { z } from 'zod';

export type RecognitionFieldKey =
  | 'full_name'
  | 'identity'
  | 'region'
  | 'district'
  | 'group'
  | 'unit'
  | 'issue_date'
  | 'recognition_code'
  | 'recognition_name';

export interface RecognitionFieldConfig {
  id: string; // e.g. "field-full_name"
  field_key: RecognitionFieldKey;
  label: string;
  x: number; // Position X in percentage (0-100) or mm (0-297)
  y: number; // Position Y in percentage (0-100) or mm (0-210)
  font_family: 'helvetica' | 'times' | 'courier';
  font_size: number; // e.g. 10 - 48
  font_weight: 'normal' | 'bold' | 'italic';
  color: string; // e.g. "#1b7a37" or "#222222"
  align: 'left' | 'center' | 'right';
}

export interface CertificateTemplate {
  background_url: string; // Data URL or storage URL
  page_width: number; // e.g. from uploaded image naturalWidth or 297 (A4 mm)
  page_height: number; // e.g. from uploaded image naturalHeight or 210 (A4 mm)
  aspect_ratio?: number; // width / height ratio (e.g. 1.414, 1.333, 1.777, etc.)
  orientation: 'landscape' | 'portrait';
  fields: RecognitionFieldConfig[];
}

export interface RecognitionType {
  id: string;
  name: string;
  created_at: string;
  user_id?: string;
  template?: CertificateTemplate;
}

export interface TemplateFieldDefinition {
  field_key: RecognitionFieldKey;
  label: string;
  default_font_size: number;
  default_font_weight: 'normal' | 'bold' | 'italic';
  default_font_family: 'helvetica' | 'times' | 'courier';
  default_color: string;
  default_align: 'left' | 'center' | 'right';
  default_x: number;
  default_y: number;
  mock_value: string;
}

export const AVAILABLE_TEMPLATE_FIELDS: TemplateFieldDefinition[] = [
  {
    field_key: 'full_name',
    label: 'Nombre y Apellido',
    default_font_size: 24,
    default_font_weight: 'bold',
    default_font_family: 'helvetica',
    default_color: '#1b7a37',
    default_align: 'center',
    default_x: 50,
    default_y: 42,
    mock_value: 'Carlos Eduardo Mendoza'
  },
  {
    field_key: 'identity',
    label: 'Cédula de Identidad',
    default_font_size: 14,
    default_font_weight: 'normal',
    default_font_family: 'helvetica',
    default_color: '#333333',
    default_align: 'center',
    default_x: 50,
    default_y: 50,
    mock_value: 'V-18.234.567'
  },
  {
    field_key: 'recognition_name',
    label: 'Nombre del Reconocimiento',
    default_font_size: 20,
    default_font_weight: 'bold',
    default_font_family: 'helvetica',
    default_color: '#8c4e37',
    default_align: 'center',
    default_x: 50,
    default_y: 32,
    mock_value: 'Insignia de Madera'
  },
  {
    field_key: 'region',
    label: 'Región Scout',
    default_font_size: 12,
    default_font_weight: 'normal',
    default_font_family: 'helvetica',
    default_color: '#444444',
    default_align: 'left',
    default_x: 20,
    default_y: 65,
    mock_value: 'Región Capital'
  },
  {
    field_key: 'district',
    label: 'Distrito Scout',
    default_font_size: 12,
    default_font_weight: 'normal',
    default_font_family: 'helvetica',
    default_color: '#444444',
    default_align: 'left',
    default_x: 20,
    default_y: 72,
    mock_value: 'Distrito Metropolitano'
  },
  {
    field_key: 'group',
    label: 'Grupo Scout',
    default_font_size: 12,
    default_font_weight: 'normal',
    default_font_family: 'helvetica',
    default_color: '#444444',
    default_align: 'left',
    default_x: 20,
    default_y: 79,
    mock_value: 'Grupo Scouts 45 San Jorge'
  },
  {
    field_key: 'unit',
    label: 'Unidad Scout',
    default_font_size: 12,
    default_font_weight: 'normal',
    default_font_family: 'helvetica',
    default_color: '#444444',
    default_align: 'left',
    default_x: 20,
    default_y: 86,
    mock_value: 'Tropa'
  },
  {
    field_key: 'issue_date',
    label: 'Fecha de Emisión',
    default_font_size: 12,
    default_font_weight: 'normal',
    default_font_family: 'helvetica',
    default_color: '#555555',
    default_align: 'center',
    default_x: 80,
    default_y: 75,
    mock_value: '12 Oct 2026'
  },
  {
    field_key: 'recognition_code',
    label: 'Código de Reconocimiento',
    default_font_size: 11,
    default_font_weight: 'normal',
    default_font_family: 'courier',
    default_color: '#666666',
    default_align: 'center',
    default_x: 80,
    default_y: 82,
    mock_value: 'REC-45-001'
  }
];

export const MOCK_CERTIFICATE_DATA: Record<RecognitionFieldKey, string> = {
  full_name: 'Carlos Eduardo Mendoza',
  identity: 'V-18.234.567',
  recognition_name: 'Insignia de Madera',
  region: 'Región Capital',
  district: 'Distrito Metropolitano',
  group: 'Grupo Scouts 45 San Jorge',
  unit: 'Tropa',
  issue_date: '12 Oct 2026',
  recognition_code: 'REC-45-001'
};

export const DEFAULT_CERTIFICATE_TEMPLATE: CertificateTemplate = {
  background_url: '',
  page_width: 297,
  page_height: 210,
  aspect_ratio: 297 / 210,
  orientation: 'landscape',
  fields: []
};

export interface CreateRecognitionTypeParams {
  name: string;
  user_id?: string;
}

export interface UpdateRecognitionTypeParams {
  name: string;
}

export const recognitionFormSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres')
});

export type RecognitionFormData = z.infer<typeof recognitionFormSchema>;

