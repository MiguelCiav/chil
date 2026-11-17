# Landing Feature Blueprint

## System Overview
The `landing` feature subsystem provides the public unauthenticated marketing and entry page for Chil, presenting platform capabilities, a 3-step recognition workflow overview, and navigation entry points to registration and sign-in routes.

## Local Interface & Invariants
- **Public Barrel (`index.ts`)**:
  - `index.ts:*` re-exports `./components/LandingPage`, `./components/HeroSection`, `./components/FeatureGridSection`, `./components/WorkflowSection`, `./components/LandingFooter`, and `./types`.
  - **Invariants**: None (pure barrel re-export module).
  - **Side Effects**: None.

## Subdirectories & System Boundaries
- **Components**: [`./components/README.md`](./components/README.md) — Public landing page composition (`LandingPage`, `HeroSection`, `FeatureGridSection`, `WorkflowSection`, `LandingFooter`).
- **Types**: [`./types/README.md`](./types/README.md) — TypeScript interfaces (`FeatureCardItem`, `WorkflowStepItem`, `ScoutValueItem`).

## Global Invariants
- **Public Entry Routing**: `HeroSection` and `LandingFooter` link directly to `/registro` and `/login` via React Router `Link`; `LandingFooter` module links target `#exportacion-flexible`, `#lotes-masivos`, and `#disenador-plantillas` card IDs in `FeatureGridSection`.
- **Static Presentational Content**: All capability cards, workflow steps, and SVG/logo assets are static client-side UI with no backend/Firestore queries or auth state dependencies.

## Global Side Effects
- None (pure static React UI and React Router `Link` navigation targets; `LandingFooter` reads `new Date().getFullYear()` at render time).

## System Verification
- Run: `npm test -- --run`
