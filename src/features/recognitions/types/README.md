# Recognitions Types

## Overview
Defines TypeScript interfaces, union types, Zod validation schema, and default/mock constants for recognition types and certificate templates.

## Interface
- `index.ts:RecognitionFieldKey`: Union type of 9 field keys (`'full_name' | 'identity' | 'region' | 'district' | 'group' | 'unit' | 'issue_date' | 'recognition_code' | 'recognition_name'`).
- `index.ts:RecognitionFieldConfig`: Interface for a placed certificate field's `id`, `field_key`, `label`, coordinates, typography, color, and alignment.
- `index.ts:CertificateTemplate`: Interface for template `background_url`, `page_width`, `page_height`, optional `aspect_ratio`, `orientation`, and `fields`.
- `index.ts:RecognitionType`: Interface for a recognition record (`id`, `name`, `created_at`, optional `user_id`, optional `template`).
- `index.ts:TemplateFieldDefinition`: Interface for catalog field metadata, default styling/coordinates, and `mock_value`.
- `index.ts:AVAILABLE_TEMPLATE_FIELDS`: Constant array of 9 `TemplateFieldDefinition` entries for all `RecognitionFieldKey` values.
- `index.ts:MOCK_CERTIFICATE_DATA`: Constant `Record<RecognitionFieldKey, string>` with sample Spanish preview values.
- `index.ts:DEFAULT_CERTIFICATE_TEMPLATE`: Constant `CertificateTemplate` with A4 landscape defaults and empty `fields`.
- `index.ts:CreateRecognitionTypeParams`: Interface `{ name: string; user_id?: string }`.
- `index.ts:UpdateRecognitionTypeParams`: Interface `{ name: string }`.
- `index.ts:recognitionFormSchema`: Zod schema validating `{ name }` as a trimmed string with minimum length 2.
- `index.ts:RecognitionFormData`: Type inferred from `recognitionFormSchema`.

## Invariants
- `index.ts:DEFAULT_CERTIFICATE_TEMPLATE`: Defaults to `background_url = ''`, `page_width = 297`, `page_height = 210`, `aspect_ratio = 297 / 210`, `orientation = 'landscape'`, `fields = []`.
- `index.ts:recognitionFormSchema`: Trims `name` and requires at least 2 characters (`'El nombre debe tener al menos 2 caracteres'`).

## Side Effects
- None.

## Verification
- Run: `npm test -- --run`
