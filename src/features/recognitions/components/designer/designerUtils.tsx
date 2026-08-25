import React from 'react';
import {
  User,
  CreditCard,
  Award,
  MapPin,
  Compass,
  Users,
  Calendar,
  Hash,
  Shield
} from 'lucide-react';
import {
  RecognitionFieldKey,
  RecognitionFieldConfig,
  MOCK_CERTIFICATE_DATA
} from '../../types';

export const FIELD_ICONS: Record<RecognitionFieldKey, React.ReactNode> = {
  full_name: <User className="w-4 h-4" />,
  identity: <CreditCard className="w-4 h-4" />,
  recognition_name: <Award className="w-4 h-4" />,
  unit: <Shield className="w-4 h-4" />,
  region: <MapPin className="w-4 h-4" />,
  district: <Compass className="w-4 h-4" />,
  group: <Users className="w-4 h-4" />,
  issue_date: <Calendar className="w-4 h-4" />,
  recognition_code: <Hash className="w-4 h-4" />
};

export const PRESET_COLORS = [
  { label: 'Verde Scout', value: '#1b7a37' },
  { label: 'Terracota', value: '#8c4e37' },
  { label: 'Azul Marino', value: '#1e3a8a' },
  { label: 'Rojo Carmesí', value: '#b91c1c' },
  { label: 'Negro Carbón', value: '#111827' },
  { label: 'Gris Oscuro', value: '#4b5563' }
];

export function getFormatBadgeText(
  width: number,
  height: number,
  aspectRatio?: number,
  hasCustomBackground?: boolean
): string {
  if (!hasCustomBackground) {
    return 'Formato: 297 × 210 mm';
  }

  const ratio = aspectRatio || (width && height ? width / height : 297 / 210);

  let ratioLabel: string;
  if (Math.abs(ratio - 16 / 9) < 0.04) {
    ratioLabel = '16:9';
  } else if (Math.abs(ratio - 4 / 3) < 0.04) {
    ratioLabel = '4:3';
  } else if (Math.abs(ratio - 297 / 210) < 0.04) {
    ratioLabel = 'A4 Horizontal';
  } else if (Math.abs(ratio - 210 / 297) < 0.04) {
    ratioLabel = 'A4 Vertical';
  } else if (Math.abs(ratio - 3 / 2) < 0.04) {
    ratioLabel = '3:2';
  } else if (Math.abs(ratio - 16 / 10) < 0.04) {
    ratioLabel = '16:10';
  } else if (Math.abs(ratio - 1) < 0.04) {
    ratioLabel = '1:1';
  } else {
    ratioLabel = `${Math.round(ratio * 100) / 100}:1`;
  }

  return `Formato: ${width} × ${height} (${ratioLabel})`;
}

export function getFontFamilyStyle(family: RecognitionFieldConfig['font_family']): string {
  switch (family) {
    case 'times':
      return 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif';
    case 'courier':
      return 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace';
    case 'helvetica':
    default:
      return 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  }
}

export function getAlignTransform(align: RecognitionFieldConfig['align']): string {
  switch (align) {
    case 'left':
      return 'translate(0%, -50%)';
    case 'right':
      return 'translate(-100%, -50%)';
    case 'center':
    default:
      return 'translate(-50%, -50%)';
  }
}

export function getFieldDisplayText(
  field: RecognitionFieldConfig,
  isPreviewMode: boolean,
  recognitionName?: string
): string {
  if (isPreviewMode) {
    if (field.field_key === 'recognition_name' && recognitionName) {
      return recognitionName;
    }
    return MOCK_CERTIFICATE_DATA[field.field_key] || field.label;
  }
  return `[${field.label}]`;
}
