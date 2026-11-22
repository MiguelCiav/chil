# Drift Report — 2026-11-21

Scope: `README.md`, `docs/`, and all `src/features/**/README.md` blueprints (48 documents).

## README.md

- **Node.js prerequisite vs. runtime (`Prerequisites`)**: Lists `Node.js: v18 or higher (v20+ recommended)`, whereas `functions/package.json` sets `"engines": { "node": "22" }`, `.github/workflows/ci.yml` runs `node-version: 22` in both `verify` and `deploy`, and `README.md` itself lists `Node.js 22` under `Project Stack`.
- **Vitest scope & command (`Testing and Quality Assurance`)**: Labels `npm run test` as "Frontend Testing (Vitest)" and `npx vitest run --coverage` as "Frontend Coverage (Vitest)". In reality, `vite.config.ts` runs Vitest across both frontend (`src/`) and backend test suites (`functions/__tests__/` and `scraper-api/__tests__/`), and `coverage.include` covers `["src/**/*.{ts,tsx}", "functions/**/*.js"]`. Additionally, `npm run test` starts `vitest` in interactive watch mode rather than a single run (`npm run test -- --run`, as used in `.github/workflows/ci.yml`).
- **Firebase deploy scope & missing `scraper-api/` setup (`Installation & Setup` / `Building & Deploying`)**: States `firebase deploy` deploys Hosting, Firestore rules/indexes, and Cloud Functions, while `.github/workflows/ci.yml` deploys only Hosting and Firestore (`npx firebase-tools deploy --only hosting,firestore`) and `scraper-api/` is omitted from `Installation & Setup`.

## docs/DESIGN.md

- **Hero Atmospheric Scrim (`§1 Extended Surface & Hero Palette`)**: Specifies a top-left espresso scrim (`#170702` → `#2E1208` → `rgba(68, 26, 13, 0.92)` → `rgba(140, 78, 55, 0.5)`) in `HeroSection.tsx` keeping `WSCT_LOGO_EN_RGB_NEG.svg` inside that scrim zone. In reality, `.hero-scout-gradient`, `.hero-top-mist`, and `.hero-right-gradient` in `src/index.css` are unused in `src/`; `src/features/landing/components/HeroSection.tsx` renders on `bg-secondary` (`#F1EAD8`) with `<TopoBackdrop animated stroke="#8C4E37" />`, a `rgba(233, 162, 127, 0.34)` radial glow, and `WSCT_LOGO_EN_RGB_NEG.svg` inside a standalone rounded badge (`bg-[#643425]`).
- **Hero `<h1>` Typography (`§2 Type Scale`)**: Specifies `(Hero: text-3xl sm:text-4xl lg:text-5xl font-extrabold)`, whereas `HeroSection.tsx` uses `font-display font-black tracking-tight leading-[0.94] text-[clamp(2.35rem,5vw,4.5rem)]` (and `DesignerHeader.tsx` uses `text-xl sm:text-2xl font-extrabold` for its `<h1>`).
- **Reduced Motion Classes (`§3 Reduced Motion`)**: Lists `.animate-modal-*`, `.animate-pulse`, `.animate-bounce`, `.animate-ping`, and `.animate-fade-in`, omitting `.animate-topo-drift`, `.animate-hero-rise`, `.animate-card-deal`, `.animate-marquee-left`, and `.animate-marquee-right` which are also disabled in `src/index.css` `@media (prefers-reduced-motion: reduce)`.
- **Shared Primitives (`§5 Shared Primitives`)**:
  - `src/components/index.ts` also exports `FloatingTableScrollbar.tsx` and `SearchSelectorModal.tsx`, which are omitted from §5; conversely, `src/components/navigation/Navbar.tsx` still exists and is exported from `src/components/navigation/index.ts` even though `MainLayout.tsx` renders `Sidebar.tsx` exclusively.
  - `src/components/Table.tsx` uses `text-neutral/60` on its empty-state row cell, contradicting §1's ban on `text-neutral/60` for normal text.
- **Mandatory Data-View States (`§5 Mandatory Data-View States`)**:
  - **Loading (`aria-busy="true"` / `role="status"`)**: None of the five cited views (`BatchList.tsx`, `BatchDetail.tsx`, `SummaryView.tsx`, `StatisticsDashboard.tsx`, `RecognitionCatalog.tsx`) attach `aria-busy="true"` or `role="status"` to their loading states.
  - **Error (`role="alert"`, `AlertCircle` with `aria-hidden="true"`, `text-red-700` / `bg-red-50`, `Reintentar`)**: `StatisticsDashboard.tsx` renders an error card with `Reintentar`, but omits `role="alert"` and `aria-hidden="true"` on `AlertCircle` and uses `bg-white border-red-200` / `text-neutral/70` instead of `bg-red-50` / `text-red-700`. `BatchDetail.tsx` renders its not-found state without `role="alert"` or `aria-hidden="true"` on `AlertCircle` (and logs fetch errors only to console). `BatchList.tsx`, `SummaryView.tsx`, and `RecognitionCatalog.tsx` only call `console.error` on fetch failure and render no error state UI.
- **Congruency Status Claims (`§7`)**:
  - Auth inputs in `LoginPage.tsx` and `RegisterPage.tsx` still use `border-primary/20` and `placeholder-primary/40` on `<input>` elements (both forbidden for inputs/text in §1 and §3), and `BatchMembersTable.tsx` uses `border-gray-200` and `placeholder:text-neutral/40` on its search input.
  - Claims muted labels across Statistics, Summary, Sidebar, and primary Batch/Recognition cards are standardized to `text-neutral/75`, whereas labels in `StatisticsDashboard.tsx`, `RegionSummaryTable.tsx`, `DistrictSummaryTable.tsx`, `DemographicsDonut.tsx`, `SummaryView.tsx`, `RecognitionCatalog.tsx`, `BatchList.tsx`, and `BatchMembersTable.tsx` still use `text-neutral/70`, `text-neutral/60`, `text-neutral/50`, or `text-neutral/40`.

## docs/ROLLBACK_FIREBASE_FUNCTIONS.md

- **Non-existent `loginScraper` function & missing session endpoints (`Resumen del Estado Temporal Actual` & `Paso 2`)**: States that Vercel and Firebase Cloud Functions expose `loginScraper` and `getMemberStatus`. Neither `functions/` nor `scraper-api/` defines `loginScraper`; both `functions/index.js` and `scraper-api/api/` export four endpoints: `saveScraperSession`, `getScraperSessionStatus`, `clearScraperSession`, and `getMemberStatus`.
- **Non-existent test file path (`Paso 5`)**: Instructs deleting `src/features/batches/api/__tests__/scraperApiVercel.test.ts`, which does not exist. Vercel HTTP transport tests are inside `src/features/batches/api/__tests__/scraperApi.test.ts` (alongside `scraper-api/__tests__/handlers.test.js` and `scraper-api/__tests__/lookup.test.js`).
- **Missing `.env` reference (`Paso 3`)**: Only mentions removing `VITE_SCRAPER_API_URL` from `.env.production`, whereas `.env` at the repository root also defines `VITE_SCRAPER_API_URL`.
- **Missing `SCRAPER_ENCRYPTION_KEY` secret prerequisite (`Paso 2`)**: Instructs running `firebase deploy --only functions` without noting that `functions/handlers/saveScraperSession.js` and `functions/handlers/getMemberStatus.js` require the `SCRAPER_ENCRYPTION_KEY` Firebase secret (`defineSecret("SCRAPER_ENCRYPTION_KEY")` in `functions/scraper/crypto.js`) to be provisioned prior to deploy.

## docs/designs/SITEMAP.md

- **`Feature Blueprints & Contracts` (`Landing` row, line 27)**: `src/features/landing/hooks/README.md` exists on disk but is omitted from the `Submodule Contracts` column (only `components` and `types` are linked).
- **`Design Documents` (`grouped-batch-pdf-report.md` summary, line 10)**: Still describes a `"Por grupo"` export menu on `BatchDetailHeader`, whereas `BatchReportControls` (`src/features/batches/components/detail/BatchReportControls.tsx`) was refactored to use `ScopedExportSplitButton` with a chevron button (`aria-label="Opciones de lista por grupo"`, `menuAriaLabel="Exportar lista por grupo"`).

## docs/designs/batch-wizard-cleanup-and-scraper-session.md

- **`Quick Recognition` references (Section 4, Items 11–12 & `src/features/batches/hooks/README.md`)**: References `src/features/batches/hooks/quickRecognitionHelpers.ts`, `useQuickRecognition.ts`, and `__tests__/useQuickRecognition.test.ts`, which do not exist on disk (Quick Recognition was removed from `src/`, and `src/features/batches/hooks/` now contains only `useCertificateZipDownload.ts` and `__tests__/useCertificateZipDownload.test.ts`).

## docs/designs/grouped-batch-pdf-report.md

- **`BatchReportControls` and `BatchDetailHeader` export UI/props (Overview, Goals, CUJ 2, Technical Plan §4, Phase 2 Items 4–5 & 9)**: `src/features/batches/components/detail/BatchReportControls.tsx` no longer renders a standalone `"Por grupo"` dropdown trigger button next to `"Descargar lista (PDF)"`; it delegates to `ScopedExportSplitButton` (`src/features/batches/components/detail/ScopedExportSplitButton.tsx`) with `chevronAriaLabel="Opciones de lista por grupo"`. Likewise, `src/features/batches/components/detail/BatchDetailHeader.tsx` no longer renders a standalone `"Descargar Reconocimientos (ZIP)"` `<Button>`, and `BatchDetailHeaderProps` now includes `eligibleBuckets: BatchReportBucket[]` and `onDownloadCertificatesZip: (bucketKey?: ReportBucketKey) => void`.
- **`BATCH_DETAIL_TOUR_STEPS[0].content` (Phase 2 Items 7 & 9)**: The spec specifies `'Consulta la información completa del lote. Desde la cabecera puedes descargar todos los reconocimientos oficiales en PDF, generar el reporte de lista (completo o por grupo) o eliminar el lote si es necesario.'`, whereas `src/features/batches/components/detail/batchDetailTour.ts` now reads `'Consulta la información completa del lote. Desde la cabecera puedes descargar los reconocimientos oficiales en ZIP (completo o por grupo), generar el reporte de lista en PDF (completo o por grupo) o eliminar el lote si es necesario.'`.

## docs/designs/multi-territory-batch-attribution.md

- **`QuickRecognition` / `executeQuickEmission` references (`Non-Goals`, Technical Plan §1–§2, Phase 1 Item 3)**: References the `QuickRecognition` module and `executeQuickEmission` as active in the codebase, whereas `QuickRecognition` and `executeQuickEmission` no longer exist in `src/`.

## docs/designs/scoped-certificate-zip-and-progress-modal.md

No drift detected.

## docs/designs/recognition-designer-pdf-and-ergonomics.md

- **`CertificateDesigner.tsx` toast implementation (Phase 3 Item 1)**: States that `src/features/recognitions/components/CertificateDesigner.tsx` imports `AlertTriangle` and `X` from `lucide-react` and renders the `'warning'` banner directly (`bg-amber-900 text-white border-amber-600`, `AlertTriangle`, `<button type="button" onClick={dismissNotification} aria-label="Cerrar notificación">`). In the current implementation, `CertificateDesigner.tsx` delegates rendering to `<Toast message={toast.message} variant={toast.type} onDismiss={dismissNotification} />`, and those icons, styles, and dismiss button live in `src/components/Toast.tsx`.

## src/features/auth/README.md

No drift detected.

## src/features/auth/api/README.md

No drift detected.

## src/features/auth/components/README.md

- `ForgotPasswordModal.tsx:ForgotPasswordModal` is typed as `React.FC<ForgotPasswordModalProps>` accepting `{ isOpen: boolean; onClose: () => void; defaultEmail?: string }`, whereas `## Interface` documents it only as `React.FC` without listing its props (`onClose` is omitted from the README).
- `ProtectedRoute.tsx:ProtectedRoute` is typed as `React.FC<ProtectedRouteProps>` accepting `{ children?: ReactNode }`, whereas `## Interface` documents it only as `React.FC`.

## src/features/auth/context/README.md

No drift detected.

## src/features/auth/hooks/README.md

No drift detected.

## src/features/auth/types/README.md

No drift detected.

## src/features/batches/README.md

No drift detected.

## src/features/batches/api/README.md

No drift detected.

## src/features/batches/components/README.md

- `BatchDetail.tsx:BatchDetail`: Passes `scopeLabel` and `initialTotal` as options to `useCertificateZipDownload.startDownload` (`zipDownload.startDownload(..., { scopeLabel, initialTotal, ... })`), whereas only `bucketSlug`, `onProgress`, and `signal` are forwarded to `generateBatchCertificatesZip` (the README states all five are forwarded to `generateBatchCertificatesZip` through `useCertificateZipDownload`).
- `BatchList.tsx:BatchList`: Calls `getRecognitionTypeById(targetBatch.recognition_type)` unconditionally during `handleDownloadPDF` whenever `targetBatch.recognition_type` is truthy, rather than only falling back when local state lacks data (unlike `getBatchById` and `getMembersByBatchId`).
- **Side Effects**: States that `BatchList` and `SuccessPage` use uncleaned `setTimeout` calls for auto-dismiss toast timers, omitting `NewBatchWizard.tsx:NewBatchWizard`, which also uses an uncleaned `setTimeout(..., 4000)` at line 171.

## src/features/batches/components/detail/README.md

No drift detected.

## src/features/batches/components/list/README.md

No drift detected.

## src/features/batches/components/shared/README.md

No drift detected.

## src/features/batches/components/wizard/README.md

- **Side Effects**: Claims `wizardHelpers.ts`, `Step2ReviewConfirm.tsx:Step2ReviewConfirm`, and `Step3Review.tsx:Step3Review` may invoke `console.warn`, whereas none of the files in `src/features/batches/components/wizard/` call `console.warn`.

## src/features/batches/hooks/README.md

No drift detected.

## src/features/batches/types/README.md

No drift detected.

## src/features/batches/utils/README.md

- `batchTerritorial.ts:consolidateMergedGroupTokens`: Documented as `(suppressing 'No aplica' when positive or 'No scout' tokens exist)`, whereas `consolidateMergedGroupTokens` (`batchTerritorial.ts:260-270`) only suppresses `'No aplica'` when positive `'id'` tokens exist (`idTokenMap.size > 0`), and returns `'No aplica'` rather than `'No scout'` when `'no_scout'` tokens are mixed with `'none'` (`'No aplica'`) tokens (`if (hasNoScoutToken && !hasNoneToken) return 'No scout'; return 'No aplica';`).

## src/features/landing/README.md

- Line 3 states the landing page "Keeps the original hero banner", whereas `src/features/landing/components/HeroSection.tsx` was updated to a Warm Parchment (`#F1EAD8` / `bg-secondary`) split hero featuring the `World Scouting` badge + `Chil` brand row, `RecognitionStack` (`reconocimiento-{1,2,3}.webp` three-card fan), and parchment-to-white dissolve (though `LandingPage.tsx` still retains the `{/* Original hero banner */}` comment).

## src/features/landing/components/README.md

- `WorkflowSection.tsx` (line 11): Describes `ManifestoReveal` as "tuned to reach full opacity while centered in view", whereas `src/features/landing/components/WorkflowSection.tsx` line 160 configures `useScrollProgress<HTMLHeadingElement>({ start: 0.96, end: 0.8 })` so every word reaches full opacity when the heading's bottom reaches 80% of the viewport height (fully visible in view, rather than centered).
- `Verification` (line 23): Describes `LandingPage.test.tsx` as covering "the espresso hero", whereas `src/features/landing/components/HeroSection.tsx` line 138 renders with `bg-secondary text-neutral` (Warm Parchment `#F1EAD8`; only the test description in `LandingPage.test.tsx` line 85 still says "espresso banner").

## src/features/landing/hooks/README.md

No drift detected.

## src/features/landing/types/README.md

No drift detected.

## src/features/recognitions/README.md

No drift detected.

## src/features/recognitions/api/README.md

- `imageProcessor.ts:renderPdfFirstPageWithPdfJs`: The invariant states it cleans up canvas dimensions (`releaseCanvas`) "on failure or completion", whereas `renderPdfFirstPageWithPdfJs` only calls `releaseCanvas(renderCanvas)` on failure (`if (!renderSucceeded)`), and `processPdfBackgroundFile` calls `releaseCanvas(rendered.canvas)` in its `finally` block after encoding completes.

## src/features/recognitions/components/README.md

No drift detected.

## src/features/recognitions/components/designer/README.md

No drift detected.

## src/features/recognitions/components/designer/sidebar/README.md

No drift detected.

## src/features/recognitions/hooks/README.md

No drift detected.

## src/features/recognitions/services/README.md

No drift detected.

## src/features/recognitions/types/README.md

No drift detected.

## src/features/recognitions/utils/README.md

No drift detected.

## src/features/statistics/README.md

- `Global Side Effects` (line 25): States `useStatisticsData` fetches `getAllRecognitionTypes (from ../../recognitions/api)`, whereas `src/features/statistics/hooks/useStatisticsData.ts` line 7 imports `getAllRecognitionTypes` from the feature barrel `'../../recognitions'`.

## src/features/statistics/components/README.md

No drift detected.

## src/features/statistics/components/charts/README.md

No drift detected.

## src/features/statistics/hooks/README.md

No drift detected.

## src/features/statistics/types/README.md

No drift detected.

## src/features/statistics/utils/README.md

No drift detected.

## src/features/summary/README.md

No drift detected.

## src/features/summary/components/README.md

No drift detected.

## src/features/summary/types/README.md

No drift detected.

## src/features/summary/utils/README.md

No drift detected.
