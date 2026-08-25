---
"chil": minor
---

Implement reusable Walkthroughs & Interactive Guide Engine (Motor de Guías Interactivas) and Module 1 (Listado de Lotes) tour integration:
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
- Test Suites & Quality Gate:
  - Unit tests for `useWalkthrough`, `WalkthroughOverlay`, `WalkthroughDialog`, `WalkthroughHelpButton`, and `BatchList` integration.
