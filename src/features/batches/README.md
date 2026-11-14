# Batches Feature Blueprint

## System Overview
The `batches` feature subsystem manages the full lifecycle of recognition batches and quick single-member recognitions: batch creation (via a multi-step wizard with Scout registry scraping, hierarchy matching, and unit inference), quick recognition emission, batch listing with multi-criteria filtering and batch merging, batch detail inspection and member management, and PDF/CSV/ZIP report generation.

## Local Interface & Invariants
- **Public Barrel (`index.ts`)**:
  - `index.ts:*` re-exports `./components/NewBatchWizard`, `./components/QuickRecognition`, `./components/SuccessPage`, `./components/BatchDetail`, `./components/BatchList`, `./types`, and `./api`.
  - **Invariants**: None (pure barrel re-export module).
  - **Side Effects**: None.

## Subdirectories & System Boundaries
- **API**: [`./api/README.md`](./api/README.md) - Firestore CRUD for batches and members, Scout hierarchy seeding/fetching, recognition metadata lookups, CSV/PDF batch reporting, and Scout registry scraper integration.
- **Components**: [`./components/README.md`](./components/README.md) - Top-level workflow and page views (`BatchList`, `BatchDetail`, `NewBatchWizard`, `QuickRecognition`, `SuccessPage`) and their nested subcomponents (`./components/detail/README.md`, `./components/list/README.md`, `./components/quick/README.md`, `./components/shared/README.md`, `./components/wizard/README.md`).
- **Hooks**: [`./hooks/README.md`](./hooks/README.md) - `useQuickRecognition` state/submission hook, Zod validation schema, and single-member quick emission helpers.
- **Types**: [`./types/README.md`](./types/README.md) - Feature-level TypeScript type re-exports and `ActiveFilterChip` definition (including `filterValue` and `'completeness'`).
- **Utils**: [`./utils/README.md`](./utils/README.md) - Pure helpers for recognition code generation, Scout hierarchy matching/classification, full-name splitting, age/scope-based unit inference, and read-time multi-territory batch projection and breakdown (`batchTerritorial.ts`).
- **Shared Cross-Feature Resolver (`../../utils/memberHierarchy.ts`)**: Canonical member-first hierarchy resolver (`resolveMemberHierarchy`, `isNoAplicaDistrict`) shared across `batches`, `summary`, and `statistics`.

## Read-Time Territorial Projection Flow
- `BatchList` indexes fetched `ScoutMember[]` records by `batch_id` and projects each batch via `batchTerritorial.ts:deriveBatchTerritorialProjection` -> `src/utils/memberHierarchy.ts:resolveMemberHierarchy`, rendering count-sorted multi-territory pills (`<= 3 + +N`) and exact key-based filters without mutating Firestore `batches` documents.
- `BatchDetail` computes `batchTerritorial.ts:calculateBatchTerritorialBreakdown` for `BatchTerritorialCard`, and `batchDetailColumns.tsx` / `MemberQuickViewModal.tsx` delegate group lookup directly to `src/utils/memberHierarchy.ts:resolveMemberHierarchy`.

## Global Invariants
- **Authentication & User Scoping**: `batchesCrud.ts:getAllBatches` and `membersCrud.ts:getAllMembers` return `[]` when no `userId` or `auth.currentUser?.uid` is available; `batchesCrud.ts:mergeBatches` requires at least 2 valid existing batches.
- **Member Identity & Deduplication**: `membersCrud.ts:getMemberDocId` prefixes document IDs with `${batch_id}_` when valid and distinguishes generic identities (`isGenericIdentity`: `S/C`, `N/A`, `NO_DISPONIBLE`, `SIN CEDULA`, `NONE`, empty); `getMembersByBatchId` deduplicates per batch prioritizing `recognition_code` entries then unique non-generic identity drafts.
- **Recognition Eligibility & Codes**: `codeGenerator.ts:assignBatchRecognitionCodes` generates unique per-batch codes only for `'active'` or `'exceptional'` members in `'auto'` mode; `batchDetailColumns.tsx:renderMemberActionsCell` and `SuccessPage.tsx:SuccessPage` gate single-certificate and ZIP downloads on eligible (`'active'` / `'exceptional'`) members.
- **Non-Scout vs. Registry Verification**: When `unit === 'no_scout'`, `quickRecognitionSchema.ts:quickRecognitionSchema` bypasses Scout registry verification and `unitInference.ts:inferBatchMemberUnits` forces `status: 'active'`; otherwise `useQuickRecognition` and `NewBatchWizard` enforce scraper verification (`verified_in_registry`).

## Global Side Effects
- **Cloud Firestore**: Reads and writes `batches`, `scout_members`, `regions`, `districts`, and `groups` collections (including chunked `WriteBatch` commits and hierarchy seeding in `api/hierarchyApi.ts`).
- **External Scraper / Backend API**: Routes `getScraperSessionStatus`, `saveScraperSession`, `clearScraperSession`, and `getMemberStatus` via authenticated HTTP `fetch` (when `VITE_SCRAPER_API_URL` is configured on Vercel) or Firebase `httpsCallable`, using server-encrypted Impeesa session cookies.
- **Browser Storage & DOM**: Purges legacy `chil_scraper_credentials` keys from `sessionStorage`/`localStorage`; triggers `window.alert`, `window.confirm`, `Blob` CSV/PDF/ZIP file downloads, client-side navigation (`useNavigate`), and `console.log`/`console.warn`/`console.error` logging.
- **Cryptography**: Uses `crypto.getRandomValues` in `codeGenerator.ts:generateRecognitionCode` and `batchesCrud.ts:generateSecureBatchId`.

## System Verification
- Run: `npm test`
