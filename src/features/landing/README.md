# Landing Feature Module

The public-facing landing page (`/` and `/inicio`) for **Chil** (Sistema de Emisión y Control de Reconocimientos Scouts). Pairs a Warm Parchment (`#F1EAD8` / `--color-secondary`) split hero banner featuring real recognition templates (`src/assets/recognitions/`) with scroll-driven product storytelling, using `--color-primary` (`#8C4E37`), `--color-secondary` (`#F1EAD8`), `--color-neutral` (`#383836`), dark espresso `#2E1208` stages, and `Scouts GT Planar` display typography per `docs/DESIGN.md`.

## Module Structure

- **Components**: [`./components/README.md`](./components/README.md) — `LandingPage`, `HeroSection`, `FeatureGridSection`, `ShowcaseVisuals`, `WorkflowSection`, `LandingFooter`, `TopoBackdrop`, `RevealOnScroll`.
- **Hooks**: [`./hooks/README.md`](./hooks/README.md) — `useScrollProgress` (CSS variable scroll progress) and `useActiveChapter` (sticky storytelling chapter tracking).
- **Types**: [`./types/README.md`](./types/README.md) — Shared landing TypeScript interfaces (`ShowcaseVisualProps`, `LandingChapter`, `ManifestoLine`, `ProductFactItem`).

## Public Exports ([`index.ts`](./index.ts))

- `LandingPage`, `HeroSection`, `FeatureGridSection`, `WorkflowSection`, `LandingFooter`, `RevealOnScroll`, `RevealOnScrollProps`, and `./types`.

## Routing & Integration

- Rendered in `src/App.tsx` via `RootRoute` on `/` (with `/inicio` alias) and wrapped by `MainLayout` with `p-0` public shell margins.
- Calls to action route to `/registro` and `/login` through styled `<Link>` elements without nested `<button>` elements.
