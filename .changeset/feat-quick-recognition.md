---
"chil": minor
---

Implement Quick Recognition Emission (Emisión Rápida de Reconocimiento):
- **Quick Recognition Dedicated Component (`QuickRecognition.tsx`)**:
  - Implemented single-screen instant emission workflow allowing recognition and single diploma creation in one unified step.
  - Section 1 (Datos del Reconocimiento): Dynamic recognition type selector (loading from Firestore with system fallback), cascading geographic hierarchy (Región, Distrito, Grupo), and optional comment/motive input.
  - Section 2 (Datos del Homenajeado): Scout Unit selector with 6 units (`manada`, `tropa`, `caminantes`, `clan`, `institucional`, `no_scout`), national identity (Cédula), automated SERSIN scraper query for scout units, automatic name splitting, auto-generated recognition codes with one-click regeneration and inline manual editing.
  - No Scout support: Automatically skips SERSIN scraper validation with helpful visual hint.
  - Actions: "⚡ Emitir y Descargar Diploma" validates inputs, creates a 1-member batch, creates the active member, and automatically downloads the PDF certificate diploma.
  - Success State: Shows comprehensive emission details and offers quick actions to emit another recognition, view the created batch (`/lotes/:id`), or return to batch list (`/lotes`).
- **Routing and Navigation Updates**:
  - Added protected routes `/lotes/rapido` and `/emision-rapida` in `App.tsx`.
  - Added quick access NavLink `⚡ Emisión Rápida` inside the authenticated navigation in `Navbar.tsx`.
  - Added secondary button `⚡ Emisión Rápida` in the header of `BatchList.tsx`.
  - Added tip banner in Step 1 of `NewBatchWizard.tsx` linking to `/lotes/rapido`.
  - Exported `QuickRecognition` from batches feature module (`src/features/batches/index.ts`).
- **Utilities & Helpers**:
  - Created `nameHelper.ts` with `splitFullName` utility for consistent name separation across scraper queries.
- **Testing & Quality Assurance**:
  - Added comprehensive test suite `QuickRecognition.test.tsx` (12 tests covering rendering, cascading selectors, SERSIN lookup, No Scout emission, code regeneration, form submission, PDF download, success view, and name splitting).
  - Updated `Navbar.test.tsx` and `BatchList.test.tsx` for new navigation links and header buttons.
  - Verified 100% test passing across 45 test suites (356 tests).
  - Verified 0 ESLint errors/warnings and 0 TypeScript errors.
