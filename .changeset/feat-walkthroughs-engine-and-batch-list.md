---
"chil": minor
---

Implement reusable Walkthroughs & Interactive Guide Engine (Motor de Guías Interactivas), Module 1 (Listado de Lotes), Module 2 (Emisión Rápida), and Module 3 (Nuevo Lote - Wizard de 3 Pasos) tour integration:
- Core Walkthrough Engine (`src/components/walkthrough/`):
  - `types.ts`: Define `WalkthroughPlacement`, `WalkthroughStep`, and `TourConfig` types.
  - `useWalkthrough.ts`: Custom hook managing tour lifecycle (`isOpen`, `currentStepIndex`, `currentStep`, `targetRect`), first-time auto-start with per-user `localStorage` persistence (`chil_tour_${tourId}_${userId}`), dynamic DOM measurement & smooth viewport scrolling, window resize/scroll listeners, and keyboard navigation (`Escape`, `ArrowRight`, `Enter`, `ArrowLeft`).
  - `WalkthroughDialog.tsx`: Game-like narrative dialog card with step counter badges, narrative explanations, viewport boundary collision checks, and control buttons (`Omitir guía`, `◀ Anterior`, `Siguiente ▶` / `¡Entendido! 🎉`).
  - `WalkthroughOverlay.tsx`: Full-screen SVG mask backdrop with spotlight rectangle cutout, glowing animated target highlight border, and dynamic SVG dashed connector line with target anchor dot.
  - `WalkthroughHelpButton.tsx`: Accessible interactive `?` help button triggering module guides on demand.
  - `index.ts`: Public module exports for components, hooks, and types.
- Module 1 Integration: Listado de Lotes (`src/features/batches/components/BatchList.tsx`):
  - Added `data-walkthrough` selectors for Header (`batch-list-header`), Actions (`batch-list-actions`), Filters (`batch-list-filters`), and Table (`batch-list-table`).
  - Implemented 4-step interactive guided tour for batch management and recognition downloads.
  - Mounted `WalkthroughHelpButton` and `WalkthroughOverlay`.
- Module 2 Integration: Emisión Rápida (`src/features/batches/components/QuickRecognition.tsx`):
  - Added `data-walkthrough` selectors for Header (`quick-rec-header`), Recognition fields section (`quick-rec-recognition-section`), Recipient fields section (`quick-rec-recipient-section`), and Action buttons (`quick-rec-actions-section`).
  - Implemented 4-step interactive guided tour (`QUICK_RECOGNITION_TOUR_STEPS`) covering single-step emission, recognition type/location, recipient data lookup, and immediate code generation/download.
  - Mounted `WalkthroughHelpButton` and `WalkthroughOverlay`.
- Module 3 Integration: Nuevo Lote - Wizard de 3 Pasos (`src/features/batches/components/NewBatchWizard.tsx`):
  - Added `data-walkthrough` selectors for Header (`wizard-header`), Stepper (`wizard-stepper`), Step container (`wizard-step-container`), and Navigation buttons (`wizard-navigation-buttons`).
  - Implemented 4-step interactive guided tour (`NEW_BATCH_WIZARD_TOUR_STEPS`) explaining header objective, 3-step progress flow, metadata/unit scope configuration, and step navigation.
  - Mounted `WalkthroughHelpButton` in the header and `WalkthroughOverlay`.
- Test Suites & Quality Gate:
  - Unit tests for `useWalkthrough`, `WalkthroughOverlay`, `WalkthroughDialog`, `WalkthroughHelpButton`, `BatchList`, `QuickRecognition`, and `NewBatchWizard` integration.
