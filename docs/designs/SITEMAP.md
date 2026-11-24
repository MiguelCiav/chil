# Design & Documentation Sitemap

Central index for Chil's architecture design documents, operational runbooks, and feature-level EGM blueprints.

## Design Documents (`docs/designs/`)

| Document | Status | Date | Author | Summary |
| :--- | :--- | :--- | :--- | :--- |
| [batch-wizard-cleanup-and-scraper-session.md](./batch-wizard-cleanup-and-scraper-session.md) | `Implemented` | 2026-11-12 | Miguel Ciavato | Wizard UI cleanup (`Step1DataLoad`, `Step2ReviewConfirm`, later simplified to redirect directly to `BatchDetail` upon `SuccessPage` retirement), shared `ScraperSettingsModal` / `ScraperSettingsContext` (later relocated to `src/domain/components/navigation/`), `AES-256-GCM` server-encrypted Impeesa session persistence (`scraper_sessions/{uid}` blocked on client via `firestore.rules`), and dual-transport client/backend support (`scraper-api/` on Vercel + `functions/` on Firebase). |
| [grouped-batch-pdf-report.md](./grouped-batch-pdf-report.md) | `Implemented` | 2026-11-13 | Miguel Ciavato | Grouped PDF "Lista" report (`batchReports.ts`) with continuous Scout group sections (`District` + `Region`), `"Miembros no scout"` / `"Sin grupo asignado"` buckets, uniform top header (`Alcance`), `Emisión Excepcional` summary metrics, `EditMemberModal` cleared-group `group_id: 0` fix, and scoped list export in `BatchReportControls` (now rendered via `ScopedExportSplitButton`). |
| [multi-territory-batch-attribution.md](./multi-territory-batch-attribution.md) | `Implemented` | 2026-11-13 | Miguel Ciavato | Shared member-first hierarchy resolver (`src/utils/memberHierarchy.ts`), `BatchList` read-time multi-badges (`<= 3 + +N`) + `"Completitud"` + exact token filters, `SummaryView`/`Statistics` decoupling (`"Nacional"`, member-scoped KPIs), and `BatchDetail` 4th territorial breakdown card (`BatchTerritorialCard`). |
| [scoped-certificate-zip-and-progress-modal.md](./scoped-certificate-zip-and-progress-modal.md) | `Implemented` | 2026-11-16 | Miguel Ciavato | Split-button `"Por grupo"` exports on `BatchDetailHeader` (`ScopedExportSplitButton`, eligible-only `filterEligibleReportBuckets`, `_<bucketSlug>` ZIP filenames), `BatchList` `eligibleCount === 0` row gating, and shared `useCertificateZipDownload` / `CertificateZipProgressModal` across `BatchDetail` and `BatchList` (`SuccessPage` later retired). |
| [recognition-designer-pdf-and-ergonomics.md](./recognition-designer-pdf-and-ergonomics.md) | `Implemented` | 2026-11-16 | Miguel Ciavato | Client-side page-1 `.pdf` background conversion via dynamic `pdfjs-dist` onto `#ffffff` with uniform `<= 750,000`-char scaling and 1:1 WYSIWYG placement parity, `Delete`/`Backspace` field removal with automatic `Ctrl+Z` re-selection, amber multi-page/compression notifications, and `useWalkthrough` `?` / `autoStart` fixes. |
| [authenticated-ui-standardization-and-cleanup.md](./authenticated-ui-standardization-and-cleanup.md) | `Implemented` | 2026-11-22 | Miguel Ciavato | Rewrite `docs/DESIGN.md` in `spec.md` (`version: alpha`) format, extend/add domain-agnostic `src/components/` primitives (`Button`, `Card`, `Field`, `Select`, `SearchInput`, `ErrorAlert`, inverted `DataTable`/`Pagination`), introduce `src/domain/components/` (`MemberStatusBadge`, `HierarchyFilterSelects`, `MemberHierarchySelects`, relocated `navigation/`, later expanded with `FilterCard`/`filterBadges`), delete unused components, and consolidate UI across `auth`, `recognitions`, `statistics`, `summary`, and `batches`. |
| [firestore-consumption-optimization.md](./firestore-consumption-optimization.md) | `Implemented` | 2026-11-22 | Miguel Ciavato | Static `hierarchy.json` serving in `getHierarchyData()` (0 Firestore reads/writes), generic session cache (`src/lib/sessionCache.ts`) with feature-owned write-through sync and auth eviction, deferred atomic Step 2 wizard emission (`createBatchWithMembers`) + probe-first concurrency pool (limit 4) with mid-batch circuit breaker + dual-backend 2-minute TTL session caching (`sessionStore.js`), and decoupled `recognition_templates/{id}` collection with atomic lazy `WriteBatch` (`deleteField()`) migration. |
| [post-emission-batch-member-lifecycle-and-merge.md](./post-emission-batch-member-lifecycle-and-merge.md) | `Implemented` | 2026-11-24 | Miguel Ciavato | Post-emission Impeesa re-verification (`pending`/`exceptional`, persisted `Batch.code_mode` + two-phase `ManualCodeAssignmentModal`), post-emission `identity`/`recognition_code`/`exceptional`/`unit` immutability (`EditMemberModal` `lifecycle="emitted"`, unified key-diff `saveBatchMemberUpdates`), exact `deleteBatchMember` with last-member guard (`DeleteMemberModal`), 2-step `AddSingleMemberCard`, and deterministic `mergeBatches` deduplication (`memberMerge.ts` + normalized `deduplicateBatchMembers`). |

## Operational Runbooks (`docs/`)

| Document | Purpose |
| :--- | :--- |
| [ROLLBACK_FIREBASE_FUNCTIONS.md](../ROLLBACK_FIREBASE_FUNCTIONS.md) | Step-by-step procedure to retire the temporary Vercel `scraper-api/` deployment (`VITE_SCRAPER_API_URL`) and return to native Firebase Cloud Functions once GCP Blaze billing is active on `chil-2d600`. |
| [HIERARCHY_MAINTENANCE.md](../HIERARCHY_MAINTENANCE.md) | Step-by-step guide for adding or modifying Scout regions, districts, or groups in `src/data/hierarchy.json` and optionally running `npm run seed-hierarchy`. |

## Shared Layers (`src/`)

| Layer | Blueprint | Contents |
| :--- | :--- | :--- |
| Domain UI & Navigation | [src/domain/components/README.md](../../src/domain/components/README.md) ([navigation](../../src/domain/components/navigation/README.md)) | `MemberStatusBadge`, `HierarchyFilterSelects`, `MemberHierarchySelects`, `FilterCard`, `filterBadges`, and `navigation/` (`Sidebar`, `ScraperSettingsModal`). |
| Shared Utilities | [src/utils/README.md](../../src/utils/README.md) | `datePeriod.ts` (`DatePeriodFilter`, `DATE_PERIOD_OPTIONS`, `matchesDateRange`) and `memberHierarchy.ts` (`resolveMemberHierarchy`, `getAvailableDistricts`, `getAvailableGroups`, `resolveParentHierarchyForSelection`). |

## Feature Blueprints & Contracts (`src/features/`)

| Feature | Root Blueprint | Submodule Contracts |
| :--- | :--- | :--- |
| Auth | [src/features/auth/README.md](../../src/features/auth/README.md) | [api](../../src/features/auth/api/README.md), [components](../../src/features/auth/components/README.md), [context](../../src/features/auth/context/README.md), [hooks](../../src/features/auth/hooks/README.md), [types](../../src/features/auth/types/README.md) |
| Batches | [src/features/batches/README.md](../../src/features/batches/README.md) | [api](../../src/features/batches/api/README.md), [components](../../src/features/batches/components/README.md) ([detail](../../src/features/batches/components/detail/README.md), [list](../../src/features/batches/components/list/README.md), [shared](../../src/features/batches/components/shared/README.md), [wizard](../../src/features/batches/components/wizard/README.md)), [hooks](../../src/features/batches/hooks/README.md), [types](../../src/features/batches/types/README.md), [utils](../../src/features/batches/utils/README.md) |
| Landing | [src/features/landing/README.md](../../src/features/landing/README.md) | [components](../../src/features/landing/components/README.md), [hooks](../../src/features/landing/hooks/README.md), [types](../../src/features/landing/types/README.md) |
| Recognitions | [src/features/recognitions/README.md](../../src/features/recognitions/README.md) | [api](../../src/features/recognitions/api/README.md), [components](../../src/features/recognitions/components/README.md) ([designer](../../src/features/recognitions/components/designer/README.md), [sidebar](../../src/features/recognitions/components/designer/sidebar/README.md)), [hooks](../../src/features/recognitions/hooks/README.md), [services](../../src/features/recognitions/services/README.md), [types](../../src/features/recognitions/types/README.md), [utils](../../src/features/recognitions/utils/README.md) |
| Statistics | [src/features/statistics/README.md](../../src/features/statistics/README.md) | [components](../../src/features/statistics/components/README.md) ([charts](../../src/features/statistics/components/charts/README.md)), [hooks](../../src/features/statistics/hooks/README.md), [types](../../src/features/statistics/types/README.md), [utils](../../src/features/statistics/utils/README.md) |
| Summary | [src/features/summary/README.md](../../src/features/summary/README.md) | [components](../../src/features/summary/components/README.md), [types](../../src/features/summary/types/README.md), [utils](../../src/features/summary/utils/README.md) |

## Project-Wide Docs

- [DESIGN.md](../DESIGN.md) — Color palette, typography (`Scouts GT Planar` + `Noto Sans`), shared UI primitives, domain badges, and web/PDF congruency rules.
- [README.md](../../README.md) — Local setup, Firebase emulators, test/lint commands, and build/deploy overview.
- [CHANGELOG.md](../../CHANGELOG.md) — Release history.

## Maintaining Design Docs

1. Place new design specifications in `docs/designs/<kebab-case-slug>.md`.
2. Add a row to the **Design Documents** table above with status (`Proposed`, `In Progress`, `Implemented`, or `Superseded`).
3. Keep specs synced with implementation using `/egm:egm-drift-report docs/designs`.
