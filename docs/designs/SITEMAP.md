# Design & Documentation Sitemap

Central index for Chil's architecture design documents, operational runbooks, and feature-level EGM blueprints.

## Design Documents (`docs/designs/`)

| Document | Status | Date | Author | Summary |
| :--- | :--- | :--- | :--- | :--- |
| [batch-wizard-cleanup-and-scraper-session.md](./batch-wizard-cleanup-and-scraper-session.md) | `Implemented` | 2026-11-12 | Miguel Ciavato | Wizard UI cleanup (`Step1DataLoad`, `Step2ReviewConfirm`, uniform `SuccessPage` completion), shared `ScraperSettingsModal` / `ScraperSettingsContext`, `AES-256-GCM` server-encrypted Impeesa session persistence (`scraper_sessions/{uid}` blocked on client via `firestore.rules`), and dual-transport client/backend support (`scraper-api/` on Vercel + `functions/` on Firebase). |

## Operational Runbooks (`docs/`)

| Document | Purpose |
| :--- | :--- |
| [ROLLBACK_FIREBASE_FUNCTIONS.md](../ROLLBACK_FIREBASE_FUNCTIONS.md) | Step-by-step procedure to retire the temporary Vercel `scraper-api/` deployment (`VITE_SCRAPER_API_URL`) and return to native Firebase Cloud Functions once GCP Blaze billing is active on `chil-2d600`. |

## Feature Blueprints & Contracts (`src/features/batches/`)

| Module | Document | Responsibility |
| :--- | :--- | :--- |
| Feature Root | [src/features/batches/README.md](../../src/features/batches/README.md) | System overview, global invariants, and side effects for batch management and quick recognitions. |
| API | [api/README.md](../../src/features/batches/api/README.md) | Firestore CRUD (`batchesCrud`, `membersCrud`), hierarchy loading/seeding, CSV/PDF reports, and dual-transport `scraperApi.ts`. |
| Components | [components/README.md](../../src/features/batches/components/README.md) | Page-level workflow views (`BatchList`, `BatchDetail`, `NewBatchWizard`, `QuickRecognition`, `SuccessPage`). |
| Components / Detail | [components/detail/README.md](../../src/features/batches/components/detail/README.md) | Batch detail header, summary cards, paginated table, columns, and quick-view modal. |
| Components / List | [components/list/README.md](../../src/features/batches/components/list/README.md) | Batch list filters, table columns, and `MergeBatchesModal`. |
| Components / Quick | [components/quick/README.md](../../src/features/batches/components/quick/README.md) | Quick recognition form sections and post-emission success view. |
| Components / Shared | [components/shared/README.md](../../src/features/batches/components/shared/README.md) | Reusable `DeleteBatchModal`, `EditMemberModal`, and `ManualMemberModal`. |
| Components / Wizard | [components/wizard/README.md](../../src/features/batches/components/wizard/README.md) | Wizard steps, stepper, Zod schema, `ScraperAlertModals`, tour, and helpers. |
| Hooks | [hooks/README.md](../../src/features/batches/hooks/README.md) | `useQuickRecognition`, Zod form schema, and single-member emission helpers. |
| Types | [types/README.md](../../src/features/batches/types/README.md) | Shared domain type re-exports and `ActiveFilterChip`. |
| Utils | [utils/README.md](../../src/features/batches/utils/README.md) | Code generation, Scout hierarchy matching/classification, name splitting, and unit inference. |

## Project-Wide Docs

- [README.md](../../README.md) — Local setup, Firebase emulators, test/lint commands, and build/deploy overview.
- [CHANGELOG.md](../../CHANGELOG.md) — Release history.

## Maintaining Design Docs

1. Place new design specifications in `docs/designs/<kebab-case-slug>.md`.
2. Add a row to the **Design Documents** table above with status (`Proposed`, `In Progress`, `Implemented`, or `Superseded`).
3. Keep specs synced with implementation using `/egm:egm-drift-report docs/designs`.
