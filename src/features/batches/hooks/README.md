# Batches Hooks

## Overview
Provides the React hook, Zod validation schema, and emission helper functions for the Quick Recognition workflow in the `batches` feature. It manages form state, cascading region/district/group selection, registry scraper verification, field validation, single-member batch/member creation, and single-certificate PDF download.

## Interface
- [quickRecognitionHelpers.ts:SuccessEmissionData](file:///home/miguel-ciavato/Documents/github-repos/chil/src/features/batches/hooks/quickRecognitionHelpers.ts#L15-L19) — Result payload returned after a successful quick emission (`batch`, `member`, `recognitionName`).
- [quickRecognitionHelpers.ts:QuickEmissionExecutionParams](file:///home/miguel-ciavato/Documents/github-repos/chil/src/features/batches/hooks/quickRecognitionHelpers.ts#L21-L41) — Input parameters required by `executeQuickEmission`.
- [quickRecognitionHelpers.ts:sanitizeQuickCedula](file:///home/miguel-ciavato/Documents/github-repos/chil/src/features/batches/hooks/quickRecognitionHelpers.ts#L43-L45) — Strips characters not matching `[0-9vV-]` from a cédula string.
- [quickRecognitionHelpers.ts:getScraperErrorMessage](file:///home/miguel-ciavato/Documents/github-repos/chil/src/features/batches/hooks/quickRecognitionHelpers.ts#L47-L85) — Maps `ScraperSessionError` (`SCRAPER_NOT_CONFIGURED`, `SCRAPER_SESSION_EXPIRED`) and scraper lookup errors to user-facing Spanish error messages.
- [quickRecognitionHelpers.ts:resolveQuickRecognitionType](file:///home/miguel-ciavato/Documents/github-repos/chil/src/features/batches/hooks/quickRecognitionHelpers.ts#L87-L103) — Resolves a recognition type ID against `availableRecognitionTypes` into a `RecognitionType` object.
- [quickRecognitionHelpers.ts:executeQuickEmission](file:///home/miguel-ciavato/Documents/github-repos/chil/src/features/batches/hooks/quickRecognitionHelpers.ts#L105-L204) — Creates a single-member batch and member, resolves the recognition type, and downloads the certificate PDF.
- [quickRecognitionSchema.ts:QuickRecognitionValidationParams](file:///home/miguel-ciavato/Documents/github-repos/chil/src/features/batches/hooks/quickRecognitionSchema.ts#L4-L16) — Input shape validated by `quickRecognitionSchema` and `validateQuickRecognitionFields`.
- [quickRecognitionSchema.ts:quickRecognitionSchema](file:///home/miguel-ciavato/Documents/github-repos/chil/src/features/batches/hooks/quickRecognitionSchema.ts#L18-L98) — Zod schema enforcing quick recognition form rules.
- [quickRecognitionSchema.ts:QuickRecognitionSchemaData](file:///home/miguel-ciavato/Documents/github-repos/chil/src/features/batches/hooks/quickRecognitionSchema.ts#L100) — Inferred TypeScript type of `quickRecognitionSchema`.
- [quickRecognitionSchema.ts:validateQuickRecognitionFields](file:///home/miguel-ciavato/Documents/github-repos/chil/src/features/batches/hooks/quickRecognitionSchema.ts#L102-L118) — Runs `quickRecognitionSchema.safeParse` and returns a field-to-message error map.
- [useQuickRecognition.ts:useQuickRecognition](file:///home/miguel-ciavato/Documents/github-repos/chil/src/features/batches/hooks/useQuickRecognition.ts#L48-L517) — React hook encapsulating quick recognition state, handlers, scraper lookup, validation, and submission; also re-exports `validateQuickRecognitionFields`, `quickRecognitionSchema`, `getScraperErrorMessage`, `resolveQuickRecognitionType`, `executeQuickEmission`, and types `SuccessEmissionData`, `QuickRecognitionValidationParams`, `QuickEmissionExecutionParams`.

## Invariants
- `[quickRecognitionSchema.ts:quickRecognitionSchema]`: `recognitionType`, trimmed `identity`, trimmed `firstNames`, trimmed `lastNames`, and trimmed `recognitionCode` must be non-empty; `unit` must be one of `'manada' | 'tropa' | 'caminantes' | 'clan' | 'institucional' | 'no_scout'`.
- `[quickRecognitionSchema.ts:quickRecognitionSchema]`: When `unit !== 'no_scout'`, `regionId`, `districtId`, and `groupId` must be provided (including `'0'`), and `scraperStatus === 'success'` with `verifiedCedula === identity.trim()` is required.
- `[quickRecognitionHelpers.ts:executeQuickEmission]`: When `unit === 'no_scout'` and hierarchy IDs are empty (or parse to `NaN`), `region_id`, `district_id`, and `group_id` default to `0`; `verified_in_registry` is `unit !== 'no_scout'`; `birth_date` defaults to `'2000-01-01'` when empty; `createBatch` must complete before `createMember` (which links `batch_id: createdBatch.id` and sets `status: 'active'`), followed by `downloadSingleCertificatePdf`.
- `[quickRecognitionHelpers.ts:sanitizeQuickCedula]`: Only characters in `[0-9vV-]` are retained.
- `[useQuickRecognition.ts:useQuickRecognition]`: Changing `identity` or `unit` resets `scraperStatus` to `'idle'`, `scraperMsg` to `''`, and `verifiedCedula` to `null`.
- `[useQuickRecognition.ts:useQuickRecognition]`: Selecting `unit` `'institucional'` or `'no_scout'` sets `memberType` to `'adult'`; other units set `memberType` to `'young'`. When `handleConsult` computes `age !== null`, `memberType` is set to `'adult'` if `age >= 21`, else `'young'`.
- `[useQuickRecognition.ts:useQuickRecognition]`: Selecting `regionId === '0'` cascades `districtId` and `groupId` to `'0'` (otherwise clears both to `''`); selecting `districtId === '0'` cascades `groupId` to `'0'` (otherwise clears it to `''`).
- `[useQuickRecognition.ts:useQuickRecognition]`: `recognitionCode` is uppercased on manual change and generated with prefix `'REC'` on initialization, regeneration, or reset (`handleEmitAnother`).

## Side Effects
- `[useQuickRecognition.ts:useQuickRecognition]`: Fetches hierarchy data (`getHierarchyData`) and recognition types (`getAllRecognitionTypes(user?.uid)`) on mount or `user?.uid` change, logging failures via `console.error`.
- `[useQuickRecognition.ts:useQuickRecognition]`: `handleConsult` calls `getMemberStatus(cleanCedula)` to query the external registry scraper and triggers a toast notification on success.
- `[useQuickRecognition.ts:useQuickRecognition]`: `triggerToast` sets a `4000ms` `setTimeout` (cleared on unmount or subsequent calls) to auto-hide toast notifications.
- `[useQuickRecognition.ts:useQuickRecognition]`: `handleSubmit` calls `executeQuickEmission`, logs errors via `console.error`, and triggers success or error toast notifications.
- `[quickRecognitionHelpers.ts:executeQuickEmission]`: Persists batch and member records via `createBatch` and `createMember`, and triggers a browser PDF download via `downloadSingleCertificatePdf`.

## Verification
- Run: `npm test`
