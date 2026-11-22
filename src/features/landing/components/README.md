# Landing Components

UI sections making up the public `/` and `/inicio` landing experience. Built on `docs/DESIGN.md` tokens with scroll-driven effects that collapse to their final state under `prefers-reduced-motion: reduce`.

## Component Map

- [`LandingPage.tsx`](./LandingPage.tsx): Page wrapper (`overflow-x-clip`, which keeps `position: sticky` working) composing `HeroSection`, `FeatureGridSection`, `WorkflowSection`, and `LandingFooter`.
- [`HeroSection.tsx`](./HeroSection.tsx): Warm Parchment `#F1EAD8` hero (inverse of the espresso footer) without navbar: terracotta animated `TopoBackdrop` + scroll-linked parallax layer (`data-testid="hero-top-gradient"`, `useScrollProgress` with `reducedValue: 0`), negative `World Scouting` logo in a rounded `#643425` badge positioned left of the unframed native `Chil` emblem on tablet/desktop, left-aligned two-line headline (`Valida registros.` / `Reconoce rápido.`), operational descriptor, `/registro` + `/login` CTAs as styled `<Link>` elements, an editorial three-card fan (`RecognitionStack`) using real Venezuelan Scout portrait recognition templates (`src/assets/recognitions/reconocimiento-{1,2,3}.webp`) with a dynamic `Nombre y Apellido` field marker, `Registro vigente` seal, `216 mm` Carta ruler, `animate-card-deal` entrance and scroll spread, plus a soft multi-stop parchment-to-white atmospheric dissolve into the white storytelling canvas.
- [`FeatureGridSection.tsx`](./FeatureGridSection.tsx): Oversized statement heading (`Genera lotes de reconocimientos` / `En una sola herramienta`) with scroll-linked lift, followed by sticky storytelling: four chapters (`#lotes-masivos`, `#disenador-plantillas`, `#exportacion-flexible`, `#analitica-territorial`) scroll on the left while a pinned dark stage on desktop crossfades the matching animated visual and a progress rail. On phones/tablets each visual renders inline under its chapter.
- [`ShowcaseVisuals.tsx`](./ShowcaseVisuals.tsx): Decorative, `active`-driven product mockups (`VerifyVisual`, `DesignVisual`, `ExportVisual`, `AnalyticsVisual`) animated with CSS transitions and staggered delays.
- [`WorkflowSection.tsx`](./WorkflowSection.tsx): Section `#proceso` with a continuously moving dark espresso `#2E1208` two-row recognition marquee (with an accessible pause/resume button and reduced-motion disablement), a word-by-word manifesto reveal ("Menos tiempo en planillas. Más tiempo para tus objetivos.") tuned (`start: 0.96, end: 0.8`) to reach full opacity as soon as the heading enters view, and three product facts (`1:1`, `6`, `AES-256`).
- [`LandingFooter.tsx`](./LandingFooter.tsx): Dark `#2E1208` closing CTA ("Tu próximo lote empieza hoy.") with drifting topographic lines and scroll-linked scale, plus compact footer (section anchors, `/login`, `/registro`, Scout motto, dynamic copyright).
- [`TopoBackdrop.tsx`](./TopoBackdrop.tsx): Decorative topographic contour SVG (`aria-hidden`), optional `animated` drift (`.animate-topo-drift` in `src/index.css`).
- [`RevealOnScroll.tsx`](./RevealOnScroll.tsx): `IntersectionObserver` fade/translate reveal wrapper (`threshold: 0.12`, directions `'up' | 'left' | 'right' | 'none'`) visible immediately when `IntersectionObserver` is absent or reduced motion is requested.

## Hooks ([`../hooks/`](../hooks))

- `useScrollProgress(options)`: Writes element scroll progress (0 to 1) into the `--scroll-progress` CSS variable per animation frame, without React re-renders; configurable `reducedValue` fallback (defaults to `1`, set to `0` for scroll-exit parallax) under reduced motion.
- `useActiveChapter(count)`: Tracks the chapter in the viewport middle band (`rootMargin: '-40% 0px -40% 0px'`) and marks chapters as seen via a second lenient observer (`threshold: 0.12`) so mobile inline visuals animate reliably; all chapters count as seen without `IntersectionObserver`.

## Verification ([`__tests__/LandingPage.test.tsx`](./__tests__/LandingPage.test.tsx))

Covers `RevealOnScroll` fallbacks and intersection, the parchment split hero (no navigation, headline/descriptor, link CTAs), chapter anchors and active-chapter switching, manifesto and product facts, closing CTA/footer links, composition, and `/inicio` routing.
