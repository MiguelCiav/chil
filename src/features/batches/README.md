# Batches Feature Blueprint

## System Overview
The `batches` feature subsystem manages the full lifecycle of recognition batches: batch creation (via a multi-step wizard with Scout registry scraping, hierarchy matching, and unit inference), batch listing with multi-criteria filtering and batch merging, batch detail inspection and member management, and PDF/CSV/ZIP report generation.

## Local Interface & Invariants
- **Public Barrel (`index.ts`)**:
  - `index.ts:*` re-exports `./components/NewBatchWizard`, `./components/BatchDetail`, `./components/BatchList`, `./types`, and `./api`.
  - **Invariants**: None (pure barrel re-export module).
  - **Side Effects**: None.

## Subdirectories & System Boundaries
- **API**: [`./api/README.md`](./api/README.md) - Firestore CRUD for batches and members, Scout hierarchy seeding/fetching, recognition metadata lookups, CSV/PDF batch reporting, and Scout registry scraper integration.
- **Components**: [`./components/README.md`](./components/README.md) - Top-level workflow and page views (`BatchList`, `BatchDetail`, `NewBatchWizard`) and their nested subcomponents (`./components/detail/README.md`, `./components/list/README.md`, `./components/shared/README.md`, `./components/wizard/README.md`).
- **Hooks**: [`./hooks/README.md`](./hooks/README.md) - `useCertificateZipDownload` (shared certificate ZIP progress, `AbortController` cancellation, and concurrency lock).
- **Types**: [`./types/README.md`](./types/README.md) - Feature-level TypeScript type re-exports.
- **Utils**: [`./utils/README.md`](./utils/README.md) - Pure helpers for recognition code generation, Scout hierarchy matching/classification, full-name splitting, age/scope-based unit inference, and read-time multi-territory batch projection and breakdown (`batchTerritorial.ts`).
- **Shared Cross-Feature Resolver (`../../utils/memberHierarchy.ts`)**: Canonical member-first hierarchy resolver (`resolveMemberHierarchy`, `isNoAplicaDistrict`) shared across `batches`, `summary`, and `statistics`.

## Read-Time Territorial Projection Flow
- `BatchList` indexes fetched `ScoutMember[]` records by `batch_id` and projects each batch via `batchTerritorial.ts:deriveBatchTerritorialProjection` -> `src/utils/memberHierarchy.ts:resolveMemberHierarchy`, rendering count-sorted multi-territory pills (`<= 3 + +N`) and exact key-based filters without mutating Firestore `batches` documents.
- `BatchDetail` computes `batchTerritorial.ts:calculateBatchTerritorialBreakdown` for `BatchTerritorialCard`, and `batchDetailColumns.tsx` / `MemberQuickViewModal.tsx` delegate group lookup directly to `src/utils/memberHierarchy.ts:resolveMemberHierarchy`.

## Global Invariants
- **Authentication & User Scoping**: `batchesCrud.ts:getAllBatches` and `membersCrud.ts:getAllMembers` return `[]` when no `userId` or `auth.currentUser?.uid` is available; `batchesCrud.ts:mergeBatches` requires at least 2 valid existing batches.
- **Member Identity & Deduplication**: `membersCrud.ts:getMemberDocId` prefixes document IDs with `${batch_id}_` when valid and distinguishes generic identities (`isGenericIdentity`: `S/C`, `N/A`, `NO_DISPONIBLE`, `SIN CEDULA`, `NONE`, empty); `getMembersByBatchId` deduplicates per batch prioritizing `recognition_code` entries then unique non-generic identity drafts.
- **Recognition Eligibility & Codes**: `codeGenerator.ts:assignBatchRecognitionCodes` generates unique per-batch codes only for `'active'` or `'exceptional'` members in `'auto'` mode; `batchDetailColumns.tsx:renderMemberActionsCell` gates single-certificate PDF downloads on eligible (`'active'` / `'exceptional'`) members (`downloadSingleCertificatePdf`), while `batchReports.ts:filterEligibleReportBuckets`, `BatchDetailHeader.tsx:BatchDetailHeader`, and `batchListColumns.tsx:renderBatchActionsCell` gate scoped/full ZIP downloads on eligible members and coordinate ZIP exports through `useCertificateZipDownload` and `CertificateZipProgressModal`.
- **Non-Scout vs. Registry Verification**: When `unit === 'no_scout'`, `unitInference.ts:inferBatchMemberUnits` and `EditMemberModal.tsx` force `status: 'active'`; otherwise `NewBatchWizard` enforces Scout registry verification (`verified_in_registry`).

## Global Side Effects
- **Cloud Firestore**: Reads and writes `batches` and `scout_members` collections (backed by `src/lib/sessionCache.ts` UID-scoped in-memory caching with write-through updates and single-`WriteBatch` `createBatchWithMembers` emission); serves territorial hierarchy (`regions`, `districts`, `groups`) directly from bundled `src/data/hierarchy.json` in `api/hierarchyApi.ts` with 0 Firestore reads/writes; and delegates `recognition_types`/`recognition_templates` reads to `../../recognitions` (`getAllRecognitionTypes`, `getRecognitionTypeById`).
- **External Scraper / Backend API**: Routes `getScraperSessionStatus`, `saveScraperSession`, `clearScraperSession`, and `getMemberStatus` via authenticated HTTP `fetch` (when `VITE_SCRAPER_API_URL` is configured on Vercel) or Firebase `httpsCallable`, using server-encrypted Impeesa session cookies.
- **Browser Storage & DOM**: Purges legacy `chil_scraper_credentials` keys from `sessionStorage`/`localStorage`; manages `document` `mousedown`/`keydown` listeners (`ScopedExportSplitButton.tsx`) and toast auto-dismiss `setTimeout` timers; triggers `window.alert`, `window.confirm`, `Blob` CSV/PDF/ZIP file downloads, client-side navigation (`useNavigate`), and `console.log`/`console.warn`/`console.error` logging.
- **Cryptography**: Uses `crypto.getRandomValues` in `codeGenerator.ts:generateRecognitionCode` and `batchesCrud.ts:generateSecureBatchId`.

## System Verification
- Run: `npm test`
