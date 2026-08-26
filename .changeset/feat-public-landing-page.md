---
"chil": minor
---

Implement official Public Landing Page feature (`src/features/landing/`) and public routing integration:
- Public Landing Page Components (`src/features/landing/components/`):
  - `HeroSection.tsx`: Scout branding with Chil logo, headline (*Chil — Sistema de Emisión y Control de Reconocimientos Scouts*), impactful subtitle, primary CTA (*🚀 Comenzar Ahora / Registrarse* ➔ `/registro`), secondary CTA (*🔐 Iniciar Sesión* ➔ `/login`), quick action link (*⚡ Conoce la Emisión Rápida* ➔ `#emision-rapida`), and high-fidelity visual mock certificate preview card with Scout metadata badges (`V-12.345.678`, `Tropa Scout`, `REC-8F3A2B`).
  - `FeatureGridSection.tsx`: 6 core capability cards showcasing Emisión Rápida, Lotes Masivos, Diseñador de Plantillas, Unidades Scouts & No Scout / Agradecimientos, Analítica Territorial & YoY, and Aislamiento Multi-Tenant.
  - `WorkflowSection.tsx`: 3-step intuitive workflow (*1. Configurar*, *2. Verificar*, *3. Emitir*) highlighting streamlined issuance flow.
  - `LandingFooter.tsx`: Public footer with copyright, scout motto (*Siempre Listos para Servir ⚜️*), and platform navigation links.
  - `LandingPage.tsx`: Main responsive orchestrator assembling all landing subcomponents.
- Routing & Navigation Integration:
  - `src/App.tsx`: Added public root route `/` rendering `<LandingPage />` for unauthenticated visitors and redirecting authenticated users to `/lotes`. Added public `/inicio` route.
  - `src/components/Navbar.tsx`: Updated Chil brand logo to link to `/` (Landing Page) when unauthenticated and `/lotes` when authenticated.
- Tests & Quality Gate:
  - Comprehensive unit test suite `src/features/landing/components/__tests__/LandingPage.test.tsx` verifying Hero, Capability Cards, Workflow, Scout Values, Footer, and unauthenticated/authenticated navigation behavior.
  - Updated `src/components/__tests__/Navbar.test.tsx` for logo routing behavior.
