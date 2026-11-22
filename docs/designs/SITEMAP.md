# Design & Documentation Sitemap

Central index for Chil's architecture design documents, operational runbooks, and feature-level EGM blueprints.

## Design Documents (`docs/designs/`)

| Document | Status | Date | Author | Summary |
| :--- | :--- | :--- | :--- | :--- |
| [batch-wizard-cleanup-and-scraper-session.md](./batch-wizard-cleanup-and-scraper-session.md) | `Implemented` | 2026-11-12 | Miguel Ciavato | Wizard UI cleanup (`Step1DataLoad`, `Step2ReviewConfirm`, uniform `SuccessPage` completion), shared `ScraperSettingsModal` / `ScraperSettingsContext`, `AES-256-GCM` server-encrypted Impeesa session persistence (`scraper_sessions/{uid}` blocked on client via `firestore.rules`), and dual-transport client/backend support (`scraper-api/` on Vercel + `functions/` on Firebase). |
| [grouped-batch-pdf-report.md](./grouped-batch-pdf-report.md) | `Implemented` | 2026-11-13 | Miguel Ciavato | Grouped PDF "Lista" report (`batchReports.ts`) with continuous Scout group sections (`District` + `Region`), `"Miembros no scout"` / `"Sin grupo asignado"` buckets, uniform top header (`Alcance`), `Emisión Excepcional` summary metrics, `EditMemberModal` cleared-group `group_id: 0` fix, and scoped list export in `BatchReportControls` (now rendered via `ScopedExportSplitButton`). |
| [multi-territory-batch-attribution.md](./multi-territory-batch-attribution.md) | `Implemented` | 2026-11-13 | Miguel Ciavato | Shared member-first hierarchy resolver (`src/utils/memberHierarchy.ts`), `BatchList` read-time multi-badges (`<= 3 + +N`) + `"Completitud"` + exact token filters, `SummaryView`/`Statistics` decoupling (`"Nacional"`, member-scoped KPIs), and `BatchDetail` 4th territorial breakdown card (`BatchTerritorialCard`). |
| [scoped-certificate-zip-and-progress-modal.md](./scoped-certificate-zip-and-progress-modal.md) | `Implemented` | 2026-11-16 | Miguel Ciavato | Split-button `"Por grupo"` exports on `BatchDetailHeader` (`ScopedExportSplitButton`, eligible-only `filterEligibleReportBuckets`, `_<bucketSlug>` ZIP filenames), `BatchList` `eligibleCount === 0` row gating, and shared `useCertificateZipDownload` / `CertificateZipProgressModal` across `BatchDetail`, `BatchList`, and `SuccessPage`. |
| [recognition-designer-pdf-and-ergonomics.md](./recognition-designer-pdf-and-ergonomics.md) | `Implemented` | 2026-11-16 | Miguel Ciavato | Client-side page-1 `.pdf` background conversion via dynamic `pdfjs-dist` onto `#ffffff` with uniform `<= 750,000`-char scaling and 1:1 WYSIWYG placement parity, `Delete`/`Backspace` field removal with automatic `Ctrl+Z` re-selection, amber multi-page/compression notifications, and `useWalkthrough` `?` / `autoStart` fixes. |

## Operational Runbooks (`docs/`)

| Document | Purpose |
| :--- | :--- |
| [ROLLBACK_FIREBASE_FUNCTIONS.md](../ROLLBACK_FIREBASE_FUNCTIONS.md) | Step-by-step procedure to retire the temporary Vercel `scraper-api/` deployment (`VITE_SCRAPER_API_URL`) and return to native Firebase Cloud Functions once GCP Blaze billing is active on `chil-2d600`. |

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
