# Quick Recognition Components

## Overview
Form sections and post-emission success view used by `QuickRecognition` to capture recognition metadata, recipient details, and display the generated single-member recognition summary.

## Interface
- `QuickRecognitionSuccess.tsx:QuickRecognitionSuccess`, `QuickRecognitionSuccess.tsx:QuickRecognitionSuccessProps`
- `RecipientFieldsSection.tsx:RecipientFieldsSection`, `RecipientFieldsSection.tsx:RecipientFieldsSectionProps`
- `RecognitionFieldsSection.tsx:RecognitionFieldsSection`, `RecognitionFieldsSection.tsx:RecognitionFieldsSectionProps`

## Invariants
- `RecipientFieldsSection.tsx:RecipientFieldsSection` hides the registry lookup (`Consultar`) button and displays a non-verification notice when `unit === 'no_scout'`.
- `RecognitionFieldsSection.tsx:RecognitionFieldsSection` disables district selection when `!regionId || regionId === '0' || loadingHierarchy` and disables group selection when `!districtId || districtId === '0' || regionId === '0' || loadingHierarchy`, coercing dependent values to `'0'` when parent selection is `'0'`.

## Side Effects
- `QuickRecognitionSuccess.tsx:QuickRecognitionSuccess` triggers client-side navigation via `navigate(\`/lotes/${successData.batch.id}\`)` and `navigate('/lotes')`.

## Verification
- Run: `npm test`
