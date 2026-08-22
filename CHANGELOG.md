# chil

## 0.8.0

### Minor Changes

- 29f18c3: Implement US-04 (Visualización de Lotes / Issue #22) and US-05 (Detalle de Lote / Issue #23):
  - Created `BatchList` component with TanStack Table, top KPI statistics, dynamic active filter chips bar, row action controls, and batch deletion modal with instant state removal and toast notification.
  - Refined `BatchDetail` component with Top 3 KPI cards, member search filter, numbered pagination, CSV list export, client-side PDF generation, quick view modal, member editing modal, and batch deletion capability with redirect to `/lotes`.
  - Implemented `deleteBatch(batchId)` in Batches API to atomically delete the batch document and all associated scout members from Firestore via `writeBatch`.
  - Removed "Ruta de guardado local" banner, configuration modal, and associated API storage path functions.
  - Fixed Navbar active link selection using `end` prop on `/lotes` and `/lotes/nuevo` NavLinks to prevent prefix collisions.
  - Added comprehensive unit test suites for `BatchList`, `BatchDetail`, `Navbar`, and API with 100% test coverage.
- 29f18c3: Refactor database to split member names into first_names and last_names with custom splitting rules, update Step 3 wizard and detail views edit forms, configure SonarQube quality analysis in GitHub Actions, and automate changesets release planner and Firebase deployment.

### Patch Changes

- 29f18c3: Include unactive and pending members in generated batch PDF reports with status indicators and styling.
- 29f18c3: Increase test coverage across backend scraper Cloud Functions and frontend batch components to exceed SonarCloud Quality Gate standards (>84% line coverage).
- 29f18c3: Resolve 32 SonarCloud code quality, reliability, and security findings across frontend components and cloud function handlers.

## 0.7.1

### Patch Changes

- 448017c: Optimize CI/CD pipeline to use direct automated releases on merge to main:
  - Removed intermediary "Version Packages" PR cycle, allowing automatic versioning, tagging, and immediate Firebase deployment in a single run upon merging to `main`.
  - Added build artifact sharing between test and deploy stages to eliminate redundant Vite builds.
  - Configured path filters to ignore documentation-only changes and added concurrency cancel-in-progress controls for feature PRs.

## 0.7.0

### Minor Changes

- 80f6697: Refactor database to split member names into first_names and last_names with custom splitting rules, update Step 3 wizard and detail views edit forms, configure SonarQube quality analysis in GitHub Actions, and automate changesets release planner and Firebase deployment.

### Patch Changes

- 80f6697: Include unactive and pending members in generated batch PDF reports with status indicators and styling.
- 80f6697: Increase test coverage across backend scraper Cloud Functions and frontend batch components to exceed SonarCloud Quality Gate standards (>84% line coverage).
- 80f6697: Resolve 32 SonarCloud code quality, reliability, and security findings across frontend components and cloud function handlers.

## 0.6.0

### Minor Changes

- 450623d: Implement premium visual wizard refinements, button-modal search selectors for Regions, Districts, and Groups, dynamic SQLite database seeding from external db using ATTACH DATABASE, and integrated automated test coverage pipelines for Vitest and Rust.

## 0.5.0

### Minor Changes

- c7426dd: The CI/CD pipeline for the app development now works completely, it builds the app on Windows, Mac (both intel and arm), and Linux

### Patch Changes

- c7426dd: The duplicated releases are now fixed

## 0.4.0

### Minor Changes

- b05c157: The CI/CD pipeline for the app development now works completely, it builds the app on Windows, Mac (both intel and arm), and Linux

## 0.3.0

### Minor Changes

- 9795797: Added a matrix for Windows, Mac, and Linux builds, this way let users of all platforms to use this software (with some restrictions)

## 0.2.0

### Minor Changes

- 6dff257: Added a new guide for contributions. Also, there are some new details on the readme markdown

## 0.1.0

### Minor Changes

- Initial project setup with testing and versioning tools
