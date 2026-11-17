# Landing Components

## Overview
Implements the public-facing landing page sections for Chil: the hero banner with Scout topographic SVG artwork and auth CTAs, the 6-card capability grid, the 3-step workflow section, and the footer.

## Interface
- `LandingPage.tsx:LandingPage`: `React.FC` composing `HeroSection`, `FeatureGridSection`, `WorkflowSection`, and `LandingFooter`.
- `HeroSection.tsx:HeroSection`: `React.FC` rendering the hero banner, World Scouting and Chil logos, topographic contour SVG, and `/registro` + `/login` CTA links.
- `FeatureGridSection.tsx:FeatureGridSection`: `React.FC` rendering the `#capacidades` section with 6 `ExtendedFeatureItem` capability cards.
- `WorkflowSection.tsx:WorkflowSection`: `React.FC` rendering the 3-step `"¿Cómo funciona Chil?"` workflow grid.
- `LandingFooter.tsx:LandingFooter`: `React.FC` rendering the footer with brand summary, `/login` + `/registro` links, anchor links to feature cards, and dynamic copyright year.

## Invariants
- `HeroSection.tsx:HeroSection`: Links `"Comenzar Ahora"` to `/registro` and `"Iniciar Sesión"` to `/login`; marks decorative topographic `<svg>` with `aria-hidden="true"`.
- `FeatureGridSection.tsx:FeatureGridSection`: Renders 6 static capability cards (`#exportacion-flexible`, `#lotes-masivos`, `#disenador-plantillas`, `#unidades-scouts`, `#analitica-territorial`, `#seguridad-multi-tenant`), conditionally rendering `feature.badge` only when present.
- `WorkflowSection.tsx:WorkflowSection`: Renders 3 ordered `WorkflowStepItem` cards (`1`–`3`) and renders the inter-step `ArrowRight` connector only when `index < steps.length - 1`.
- `LandingFooter.tsx:LandingFooter`: Computes copyright year via `new Date().getFullYear()`, links `"Iniciar Sesión"` to `/login`, `"Crear Cuenta / Registrarse"` to `/registro`, and module anchors to `#exportacion-flexible`, `#lotes-masivos`, and `#disenador-plantillas`.

## Side Effects
- None.

## Verification
- Run: `npm test -- --run`
