# chil

## 0.10.0

### Minor Changes

- 157e4ff: Implement user authentication, registration, and strict per-user data isolation:
  - **Authentication with Firebase Auth**:
    - Implemented `LoginPage` and `RegisterPage` with comprehensive form validation (via React Hook Form + Zod), password visibility toggles, and friendly error handling.
    - Implemented `ForgotPasswordModal` for self-service password recovery.
    - Created `AuthContext` and `useAuth` hook managing user session lifecycle, persistent authentication state, and actions (`login`, `register`, `logout`, `resetPassword`).
  - **Route Protection & User Experience**:
    - Added `ProtectedRoute` guard redirecting unauthenticated users to `/login` with return destination preservation.
    - Added user profile dropdown menu (`UserProfileMenu`) in `Navbar` displaying user initials avatar, full name, email, and logout action.
    - Redirect authenticated users attempting to access `/login` or `/registro` directly to `/lotes`.
  - **Strict Multi-Tenant Data Isolation by `user_id`**:
    - Scoped batch and member CRUD operations to the authenticated `user_id` (`createBatch`, `updateBatch`, `getAllBatches`, `createMember`, `updateMember`, `getAllMembers`).
    - Scoped custom recognition types to `user_id` (`createRecognitionType`, `updateRecognitionType`, `getAllRecognitionTypes`).
    - Scoped statistics dashboard and summary tables to only aggregate data belonging to the authenticated user.
  - **Shared Scout Hierarchy**:
    - Maintained global shared access to the Scout geographic hierarchy (regions, districts, groups).
  - **Testing & Quality Assurance**:
    - Full test coverage for authentication flows, API layer data scoping, protected routes, and components.
- 3668b9a: Implement US-04 (Visualización de Lotes / Issue #22) and US-05 (Detalle de Lote / Issue #23):
  - Created `BatchList` component with TanStack Table, top KPI statistics, dynamic active filter chips bar, row action controls, and batch deletion modal with instant state removal and toast notification.
  - Refined `BatchDetail` component with Top 3 KPI cards, member search filter, numbered pagination, CSV list export, client-side PDF generation, quick view modal, member editing modal, and batch deletion capability with redirect to `/lotes`.
  - Implemented `deleteBatch(batchId)` in Batches API to atomically delete the batch document and all associated scout members from Firestore via `writeBatch`.
  - Removed "Ruta de guardado local" banner, configuration modal, and associated API storage path functions.
  - Fixed Navbar active link selection using `end` prop on `/lotes` and `/lotes/nuevo` NavLinks to prevent prefix collisions.
  - Added comprehensive unit test suites for `BatchList`, `BatchDetail`, `Navbar`, and API with 100% test coverage.
- 3668b9a: Implement configurable recognition codes with automatic short hash generation and manual entry options in the New Batch wizard Step 3 review, supporting inline and modal editing, code regeneration, clearing, and persistence to Firestore.
- 3668b9a: Implement exceptional recognition emission and manual approval (Emisión Excepcional):
  - Models & Types:
    - Added `export type MemberStatus = 'active' | 'pending' | 'exceptional'` in `src/features/batches/types/index.ts` and updated `ScoutMember`.
    - Updated `SummaryRowData` and `SummaryFilterState` in `src/features/summary/types/index.ts` to recognize `'exceptional'` status and `'Emisión Excepcional'` label.
  - Modal de Edición de Miembro:
    - Added "Autorizar emisión de diploma (Caso Excepcional)" toggle card in `BatchDetail.tsx` and `Step3Review.tsx` for non-validated members with explanatory text and code auto-generation.
  - Certificate & PDF Generation:
    - Updated `generateBatchCertificatesPdf` and `downloadSingleCertificatePdf` in `certificatePdfGenerator.ts` to support both `active` and `exceptional` members.
    - Enabled individual diploma download in `BatchDetail.tsx` for `active` and `exceptional` members.
  - UI & Semantic Badges:
    - Updated status badge styling across `BatchDetail.tsx`, `Step3Review.tsx`, `SuccessPage.tsx`, and `SummaryView.tsx`:
      - `active`: `● Registro Válido` (green)
      - `exceptional`: `● Emisión Excepcional` (purple)
      - `pending`: `● Registro Inválido` (red)
    - Updated `SummaryView.tsx` status filter options and Excel export with `Emisión Excepcional`.
    - Updated `codeGenerator.ts` to assign codes in auto mode to both active and exceptional members.
  - Comprehensive Unit Tests:
    - Updated and added tests in `BatchDetail.test.tsx`, `Step3Review.test.tsx`, `certificatePdfGenerator.test.ts`, `SummaryView.test.tsx`, `excelExport.test.ts`, and `codeGenerator.test.ts`.
- 3668b9a: Implement general summary view ("Resumen") and remove KPI cards from Batch List:
  - Removed top KPI metric cards ("Total Generado", "Reconocimiento más común") from `BatchList.tsx`.
  - Created dedicated `summary` feature module under `src/features/summary/`:
    - `SummaryView.tsx`: Global summary table built with TanStack Table displaying 12 columns (Fecha, Lote, Reconocimiento, Cédula, Nombre, Apellido, Tipo, Estatus, Código Rec., Región, Distrito, Grupo), instant global search across all fields, multi-dimensional filters (recognition, region/district/group hierarchy, member type, status, and date periods/custom ranges), table pagination, and empty state.
    - `excelExport.ts`: Excel/CSV export utility (`exportToExcel`) with UTF-8 BOM encoding and standard Spanish headers.
    - `types/index.ts`: `SummaryRowData` flat interface and filter types.
    - `index.ts`: Barrel exports for the module.
  - Added navigation link for "Resumen" in `Navbar.tsx` (`to="/resumen"`) and route in `App.tsx`.
  - Added unit tests in `SummaryView.test.tsx`, `excelExport.test.ts`, and updated `BatchList.test.tsx` and `Navbar.test.tsx`.
- 3668b9a: Refactor database to split member names into first_names and last_names with custom splitting rules, update Step 3 wizard and detail views edit forms, configure SonarQube quality analysis in GitHub Actions, and automate changesets release planner and Firebase deployment.
- a34c757: Implement official Public Landing Page feature (`src/features/landing/`) and public routing integration:
  - Public Landing Page Components (`src/features/landing/components/`):
    - `HeroSection.tsx`: Scout branding with Chil logo, headline (_Chil — Sistema de Emisión y Control de Reconocimientos Scouts_), impactful subtitle, primary CTA (_🚀 Comenzar Ahora / Registrarse_ ➔ `/registro`), secondary CTA (_🔐 Iniciar Sesión_ ➔ `/login`), quick action link (_⚡ Conoce la Emisión Rápida_ ➔ `#emision-rapida`), and high-fidelity visual mock certificate preview card with Scout metadata badges (`V-12.345.678`, `Tropa Scout`, `REC-8F3A2B`).
    - `FeatureGridSection.tsx`: 6 core capability cards showcasing Emisión Rápida, Lotes Masivos, Diseñador de Plantillas, Unidades Scouts & No Scout / Agradecimientos, Analítica Territorial & YoY, and Aislamiento Multi-Tenant.
    - `WorkflowSection.tsx`: 3-step intuitive workflow (_1. Configurar_, _2. Verificar_, _3. Emitir_) highlighting streamlined issuance flow.
    - `LandingFooter.tsx`: Public footer with copyright, scout motto (_Siempre Listos para Servir ⚜️_), and platform navigation links.
    - `LandingPage.tsx`: Main responsive orchestrator assembling all landing subcomponents.
  - Routing & Navigation Integration:
    - `src/App.tsx`: Added public root route `/` rendering `<LandingPage />` for unauthenticated visitors and redirecting authenticated users to `/lotes`. Added public `/inicio` route.
    - `src/components/Navbar.tsx`: Updated Chil brand logo to link to `/` (Landing Page) when unauthenticated and `/lotes` when authenticated.
  - Tests & Quality Gate:
    - Comprehensive unit test suite `src/features/landing/components/__tests__/LandingPage.test.tsx` verifying Hero, Capability Cards, Workflow, Scout Values, Footer, and unauthenticated/authenticated navigation behavior.
    - Updated `src/components/__tests__/Navbar.test.tsx` for logo routing behavior.
- e3a21c9: Implement Quick Recognition Emission, Hierarchy Flexibility, Registry Safeguards, and UI Polish:
  - **Navbar "Emisión Rápida" Button Contrast**:
    - Enhanced contrast and crispness for the "Emisión Rápida" NavLink (`bg-amber-100 hover:bg-amber-200 text-neutral-900 border border-amber-300 font-semibold`, and `bg-amber-300 text-neutral-950 border-amber-400 font-bold` when active).
  - **"No aplica" Region and District Support**:
    - Added support for "No aplica" (id: 0) in Region, District, and Group across hierarchy data and selectors.
    - Selecting Region "No aplica" sets District and Group to "No aplica" / 0 and disables their dropdowns. Selecting District "No aplica" sets Group to "No aplica" / 0 and disables it.
    - Resolved "No aplica" / 0 to "-" or "No aplica" across diplomas, PDF generators, summaries, and batch reports.
  - **Registry Consultation Enforcement in Quick Recognition**:
    - Enforced registry verification for Scout units prior to issuing recognitions, with clear validation message: _"Debe consultar el sistema de registro para verificar la cédula del scout antes de emitir el reconocimiento."_
  - **Registry Safeguard on Unit Change in Step 3 & Batch Detail**:
    - Tracked `verified_in_registry` flag across member lifecycles. If an unverified member created under "No scout" is changed to a Scout unit in edit modals, status automatically switches to `pending` unless authorized as exceptional with a justification.
  - **Optional Hierarchy for "No Scout" Batches & Quick Emissions**:
    - Region, District, and Group are optional and default to "No aplica" (0) when `unit_scope === 'no_scout'` or `unit === 'no_scout'`.
  - **Dedicated Comments Card in Batch Detail**:
    - Cleaned main batch header title (`Lote #{batch.id}`) and added a dedicated "Comentarios / Observaciones" card displaying comment text or _"Sin observaciones registradas"_.
  - **Justification for Exceptional Recognition Emission**:
    - Added required `exceptional_reason` field when authorizing exceptional diploma emissions.
    - Displayed exceptional justification in Quick View modals and included "Justificación Excepcional" column in Excel export.
  - **Modularization & Component Architecture**:
    - Modularized `QuickRecognition.tsx` into `useQuickRecognition` custom hook, `QuickRecognitionSuccess`, `RecognitionFieldsSection`, and `RecipientFieldsSection`.
    - Modularized `BatchDetail.tsx` into `BatchSummaryCards`, `EditMemberModal`, `MemberQuickViewModal`, and `DeleteBatchModal`.
  - **Testing & Quality Assurance**:
    - 100% test pass rate across 46 test suites (375 tests), 0 ESLint errors/warnings, and 0 TypeScript build errors.
- 3668b9a: # Milestone 3: Reconocimientos y Diseñador Visual de Diplomas (US-08A, US-08B, US-08C)

  Implementación completa del módulo de reconocimientos, diseñador visual interactivo de plantillas de certificados y motor dinámico de generación/exportación de diplomas en PDF:

  ### US-08A: Catálogo y CRUD de Tipos de Reconocimientos (Issue #26)

  - **Estructura del módulo**: Nuevo módulo dedicado bajo `src/features/recognitions/` estructurado con API, componentes, tipos Zod y servicios.
  - **Capa API de Firestore (`recognition_types`)**:
    - `getAllRecognitionTypes`: Retorna la lista ordenada de reconocimientos directamente desde Firestore (sin registros dummy/auto-seeding).
    - `getRecognitionTypeById`: Obtiene un tipo de reconocimiento específico con su plantilla asociada.
    - `createRecognitionType` y `updateRecognitionType`: Creación y actualización reactiva con generación de IDs normalizados (`sct-*`).
    - `deleteRecognitionType`: Eliminación física del documento en Firestore.
  - **Catálogo de Reconocimientos (`RecognitionCatalog`)**:
    - Tabla TanStack estilizada con columnas claras: _Nombre_, _Fecha de Creación_ y _Acciones_.
    - Barra de búsqueda en tiempo real y paginación reactiva.
    - Estado vacío (_Empty State_) amigable cuando no existen tipos registrados.
    - Botón de acceso directo al diseñador visual de plantillas por cada reconocimiento.
  - **Formularios y Modales Reactivos**:
    - `RecognitionFormModal`: Validación en tiempo real del nombre y manejo de errores.
    - `RecognitionDeleteModal`: Diálogo modal de confirmación de borrado seguro con alertas Toast integradas.
  - **Integración y Navegación**:
    - Selector dinámico de tipos de reconocimiento en el Paso 1 del Asistente de Creación de Lotes (`Step1Org`).
    - Pestaña de navegación en `Navbar` (`/reconocimientos`) y rutas configuradas en `App.tsx` (`/reconocimientos` y `/reconocimientos/:id/plantilla`).

  ### US-08B: Diseñador Visual de Plantillas de Certificados (Issue #39)

  - **Diseñador Visual (`CertificateDesigner`)**:
    - Layout ergonómico de 2 columnas: Lienzo principal de alta visibilidad a la izquierda (`lg:col-span-8`) y panel lateral de control a la derecha (`lg:col-span-4`).
    - Adaptación dinámica de _Aspect Ratio_ y resolución para cualquier imagen subida (16:9, 4:3, A4, etc.) sin distorsión ni barras negras (_letterboxing_).
    - Selector de modo compacto (Edición / Vista Previa) en la barra de herramientas.
    - Barra de especificaciones de formato y dimensiones de impresión ubicada debajo del lienzo para maximizar el espacio vertical.
  - **Panel de Control con 3 Pestañas (`Campos`, `Estilo`, `Fondo`)**:
    - Apertura automática del inspector de propiedades al hacer clic en cualquier campo en el lienzo o en la lista.
    - Ajuste interactivo de posición (X, Y en porcentajes), tamaño de fuente, alineación de texto (`left`, `center`, `right`), color y peso tipográfico (`normal`, `bold`).
    - Drag-and-drop intuitivo mediante eventos de puntero (_Pointer Events_) con límites restringidos dentro del canvas.
    - Subida de fondos personalizados con compresión cliente a WebP (0.88 de calidad) para optimizar almacenamiento en Firebase Free Tier.
    - Modo de vista previa con datos scout realistas simulados para validación inmediata.

  ### US-08C: Generación y Exportación Dinámica de Diplomas en PDF (Issue #40)

  - **Motor de PDF en Cliente (`certificatePdfGenerator.ts`)**:
    - Basado en `jsPDF` de alto rendimiento para exportaciones individuales (`downloadSingleCertificatePdf`) y por lote completo (`generateBatchCertificatesPdf`).
    - Normalización física de dimensiones de página a milímetros (`getNormalizedPageDimensions`): Mantiene proporciones exactas y escala adecuada para imágenes de alta resolución sin generar páginas sobredimensionadas ni textos microscópicos.
    - Paridad 1:1 WYSIWYG entre el canvas DOM y el documento PDF, calculando la escala de fuente en base a los puntos del documento y aplicando `baseline: 'middle'` en `doc.text()` para alineación vertical idéntica.
    - Interpolación completa de variables de scouts: `full_name`, `identity`, `recognition_name`, `region`, `district`, `group`, `issue_date` y `recognition_code`.
    - Filtro automático de miembros activos (`status === 'active'`) en la generación de diplomas de lotes completos.
    - Nomenclatura estandarizada de archivos descargados: `Diplomas_Lote_<batchId>_<slug>.pdf` y `Diploma_<scoutName>_<slug>.pdf`.
  - **Integración en la Interfaz de Usuario**:
    - Botón principal de descarga de diplomas del lote y botones individuales por fila en `BatchDetail`.
    - Botón de descarga de diplomas en las filas de `BatchList`.
    - Botón de descarga en la página de éxito (`SuccessPage`).

  ### Favicon & Identidad Visual

  - Reemplazo del favicon predeterminado por el logo oficial `CHIL_LOGO.png` en `public/CHIL_LOGO.png` y enlace en `index.html`.

  ### Calidad y Pruebas

  - 152/152 pruebas unitarias pasando en 22 suites de tests.
  - 0 errores de TypeScript (`tsc`) y 0 advertencias/errores de ESLint.

- e3a21c9: Implement Scout Units and "No Scout" Direct Recognition Emission:
  - **Scout Units Model & Metadata (`ScoutUnit` & `BatchUnitScope`)**:
    - Defined 6 official scout units: `manada` (Lobatos/Lobeznas), `tropa` (Scouts), `caminantes` (Caminantes), `clan` (Rovers), `institucional` (Adultos / Dirigentes), and `no_scout` (Colaboradores / Externos).
    - Defined batch unit scopes: `mixed` (🌐 Mixto - Permite cualquier unidad) and specific scout units.
    - Added `SCOUT_UNITS` metadata mapping labels, descriptions, and color-coded badges (`manada` amber, `tropa` emerald, `caminantes` blue, `clan` red, `institucional` purple, `no_scout` slate).
    - Added helper functions `getUnitLabel` and `getUnitBadge` for consistent unit representation across the entire application.
  - **"No Scout" Direct Recognition Emission**:
    - Bypasses Sistema de Registro scraper query entirely when a member's unit is `no_scout`.
    - Sets member status directly to `Registro válido` (`active`) and immediately marks them as eligible for certificate generation.
    - Skips scraper credential verification when creating batches scoped to `no_scout`.
  - **New Batch Wizard Integration**:
    - Step 1 (Organización): Added "Alcance de Unidad" dropdown allowing creators to scope batches to a specific unit or mixed.
    - Step 2 (Verificación): Added `UNIDAD` column displaying color-coded unit badges for each member, automatically defaulting units based on batch scope or young/adult member types.
    - Step 3 (Revisión): Added unit badges to review cards and enabled Scout Unit editing in the member edit modal.
  - **Batch Details & Member Management**:
    - Displayed `Alcance de Unidad` badge on batch summary cards.
    - Added `UNIDAD` column with badges in members TanStack table.
    - Enabled modifying member Scout Unit in the member edit modal and displayed Unit in the quick view modal.
  - **Dynamic Certificate Interpolation & Visual Designer**:
    - Added `unit` (`[Unidad Scout]`) to available certificate template fields.
    - Interpolated localized unit labels in PDF diploma generation (`certificatePdfGenerator.ts`).
    - Added unit icon and mock preview support in Certificate Designer (`designerUtils.tsx`).
  - **Master Summary View & Excel Export**:
    - Added `UNIDAD` column in Master Summary View table (13 columns total).
    - Added `Unidad Scout` filter dropdown supporting filtering by any unit or No Scout.
    - Updated Excel/CSV export to include `Unidad` column in matching order.
  - **Statistics Dashboard & PDF Reports**:
    - Added `calculateUnitDistribution` (and `getUnitDistribution`) utility to aggregate member counts and percentages by Scout Unit.
    - Created `UnitDistributionCard` dashboard widget displaying segmented bar chart and unit cards with progress indicators.
    - Included Scout Unit breakdown section in executive PDF report export (`statsPdfExport.ts`).
  - **Testing & Quality Assurance**:
    - Updated and added test suites for all modified components, utils, generators, and wizards (100% passing across 44 test suites and 342 unit tests).
- e56e83f: Implement the Statistics & Analytics Dashboard (Estadísticas):
  - Feature Module Architecture (`src/features/statistics/`):
    - Created modular statistics package with components, charts, hooks, pure calculators, and PDF export utility.
  - Pure Metric & Aggregation Calculators (`src/features/statistics/utils/statsCalculators.ts`):
    - `calculateKpiMetrics`: Computes total diplomas issued (active + exceptional), batch counts, average members per batch, demographics, active geographic coverage, and validation rate with zero-division safety.
    - `calculateMonthlyTrends`: Aggregates historical diplomas by month with year inference and monthly status breakdowns.
    - `calculateRecognitionRankings`: Ranks top recognitions descending by count with badge styling and percentage share.
    - `calculateDemographics`: Computes Jóvenes vs Adultos breakdown and sub-status distribution.
    - `calculateGeographicBreakdown`: Computes Region and District volume distribution.
    - `calculateStatusBreakdown`: Computes validation health breakdown (Válido, Excepcional, Inválido).
  - Interactive SVG Charts (`src/features/statistics/components/charts/`):
    - `MonthlyTrendChart`: Responsive SVG bar chart with grid lines, month labels, hover state highlighting, and interactive tooltip.
    - `RecognitionRankingChart`: Horizontal ranked progress bars with custom recognition badges.
    - `DemographicsDonut`: SVG circular ring/donut chart with central counter and demographic legend cards.
    - `GeographicBarChart`: Ranked list with tab toggle between Regions and Districts.
    - `StatusBreakdownCard`: Segmented horizontal health bar with green/purple/red status indicators.
  - Executive PDF Report Generator (`src/features/statistics/utils/statsPdfExport.ts`):
    - Generates institutional executive summary PDF reports via `jsPDF` with KPI summary cards, monthly activity tables, rankings, geographic coverage, and multi-page pagination.
  - Navigation & Routing:
    - Added "Estadísticas" navigation link in `src/components/Navbar.tsx` with active indicator.
    - Added `/estadisticas` route in `src/App.tsx`.
  - Comprehensive Vitest Test Suites:
    - Created test suites covering calculators, PDF export, custom hook, dashboard rendering, and navigation.
- a34c757: Implement Visual Standardization Plan (Plan Maestro de Estandarización Visual) across all application modules:
  - Axis 1: Standardize Module Headers & Typography Hierarchy:
    - Title (`<h1>`): `text-2xl sm:text-3xl font-black text-neutral tracking-tight`
    - Subtitle (`<p>`): `text-xs sm:text-sm text-neutral/70 mt-1`
    - Header Container: `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2`
    - Applied uniformly across `QuickRecognition`, `NewBatchWizard`, `BatchList`, `BatchDetail`, `RecognitionCatalog`, `SummaryView`, `StatisticsDashboard`, and `SuccessPage`.
  - Axis 2: Standardize Container Widths & Margins:
    - Standardized main view page container width to `max-w-7xl mx-auto space-y-6 font-sans py-2` (and `space-y-8` for wizard and success views) across all core feature pages.
  - Axis 3: Standardize Tables (Design System Table Tokens):
    - Standardized table tokens matching design system across `Table.tsx`, `BatchList.tsx`, `BatchDetail.tsx` (members table), `SuccessPage.tsx` (summary table), `SummaryView.tsx` (master summary table), `RegionSummaryTable.tsx`, and `DistrictSummaryTable.tsx`:
      - Container: `w-full border border-primary/20 rounded-2xl overflow-hidden bg-white shadow-sm`
      - Element: `w-full text-left border-collapse`
      - Thead row: `bg-primary/10 border-b border-primary/20`
      - Header cells `<th>`: `px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider`
      - Tbody: `divide-y divide-gray-100 bg-white`
      - Rows `<tr>`: `hover:bg-primary/5 transition-colors bg-white`
      - Cells `<td>`: `px-6 py-4 text-sm text-neutral whitespace-nowrap`
      - Footer: `px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-between text-xs font-semibold text-neutral/60`
  - Axis 4: Standardize Buttons & Font Scale:
    - Updated `Button.tsx` with Design System token scale (`sm: text-xs`, `md: text-sm`, `lg: text-sm sm:text-base`) and `font-semibold transition-all rounded-xl`.
    - Cleaned up arbitrary button font-size and class overrides across components.
- a34c757: Implement reusable Walkthroughs & Interactive Guide Engine (Motor de Guías Interactivas), autoStart configuration, and comprehensive tours across all core modules:
  - Core Walkthrough Engine (`src/components/walkthrough/`):
    - `types.ts`: Define `WalkthroughPlacement`, `WalkthroughStep`, and `TourConfig` types, including optional `autoStart?: boolean` (default `true`).
    - `useWalkthrough.ts`: Custom hook managing tour lifecycle (`isOpen`, `currentStepIndex`, `currentStep`, `targetRect`), first-time auto-start with per-user `localStorage` persistence (`chil_tour_${tourId}_${userId}`), auto-start control (`autoStart !== false`), dynamic DOM measurement & smooth viewport scrolling, window resize/scroll listeners, and keyboard navigation (`Escape`, `ArrowRight`, `Enter`, `ArrowLeft`).
    - `WalkthroughDialog.tsx`: Game-like narrative dialog card with step counter badges, narrative explanations, viewport boundary collision checks, and control buttons (`Omitir guía`, `◀ Anterior`, `Siguiente ▶` / `¡Entendido!`).
    - `WalkthroughOverlay.tsx`: Full-screen SVG mask backdrop with spotlight rectangle cutout, glowing animated target highlight border, and dynamic SVG dashed connector line with target anchor dot.
    - `WalkthroughHelpButton.tsx`: Accessible interactive `?` help button triggering module guides on demand.
    - `index.ts`: Public module exports for components, hooks, and types.
  - Module 1 Integration: Listado de Lotes (`src/features/batches/components/BatchList.tsx`):
    - Added `data-walkthrough` selectors for Header (`batch-list-header`), Actions (`batch-list-actions`), Filters (`batch-list-filters`), and Table (`batch-list-table`).
    - Implemented 4-step interactive guided tour for batch management and recognition downloads with `autoStart: false`.
    - Mounted `WalkthroughHelpButton` and `WalkthroughOverlay`.
  - Module 2 Integration: Emisión Rápida (`src/features/batches/components/QuickRecognition.tsx`):
    - Added `data-walkthrough` selectors for Header (`quick-rec-header`), Recognition fields section (`quick-rec-recognition-section`), Recipient fields section (`quick-rec-recipient-section`), and Action buttons (`quick-rec-actions-section`).
    - Implemented 4-step interactive guided tour (`QUICK_RECOGNITION_TOUR_STEPS`) covering single-step emission, recognition type/location, recipient data lookup, and immediate code generation/download with `autoStart: true`.
    - Mounted `WalkthroughHelpButton` and `WalkthroughOverlay`.
  - Module 3 Integration: Nuevo Lote - Wizard de 3 Pasos (`src/features/batches/components/NewBatchWizard.tsx`):
    - Added `data-walkthrough` selectors for Header (`wizard-header`), Stepper (`wizard-stepper`), Step container (`wizard-step-container`), and Navigation buttons (`wizard-navigation-buttons`).
    - Implemented 4-step interactive guided tour (`NEW_BATCH_WIZARD_TOUR_STEPS`) explaining header objective, 3-step progress flow, metadata/unit scope configuration, and step navigation with `autoStart: true`.
    - Mounted `WalkthroughHelpButton` in the header and `WalkthroughOverlay`.
  - Module 4 Integration: Detalle del Lote (`src/features/batches/components/BatchDetail.tsx`):
    - Added `data-walkthrough` selectors for Header card (`batch-detail-header`), Summary cards (`batch-detail-summary-cards`), Members table (`batch-detail-members-table`), and Member row actions (`batch-detail-table-actions`).
    - Implemented 4-step interactive guided tour (`BATCH_DETAIL_TOUR_STEPS`) explaining batch details & PDF actions, demographic/structure summaries & observations, member list & badges, and individual actions/exceptional cases with `autoStart: false`.
    - Mounted `WalkthroughHelpButton` next to main title in header and `WalkthroughOverlay`.
  - Module 5 Integration: Diseñador Visual de Plantillas (`src/features/recognitions/components/CertificateDesigner.tsx`):
    - Added `data-walkthrough` selectors for Header bar (`designer-header`), Canvas area (`designer-canvas`), Upload background button (`designer-background-btn`), Sidebar tabs/panel (`designer-sidebar`), Edit/Preview mode switcher (`designer-mode-switch`), and Save template button (`designer-save-btn`).
    - Implemented comprehensive 6-step interactive guided tour (`CERTIFICATE_DESIGNER_TOUR_STEPS`) explaining template objectives, WYSIWYG 1:1 canvas, custom background graphic upload, dynamic variable palette and drag-and-drop, realistic scout test data preview mode, and secure cloud template persistence.
    - Mounted `WalkthroughHelpButton` in `DesignerHeader.tsx` and `WalkthroughOverlay` in `CertificateDesigner.tsx`.
  - Test Suites & Quality Gate:
    - Unit tests for `useWalkthrough` (including `autoStart: false` behavior), `WalkthroughOverlay`, `WalkthroughDialog`, `WalkthroughHelpButton`, `BatchList`, `QuickRecognition`, `NewBatchWizard`, `BatchDetail`, `DesignerHeader`, `DesignerCanvas`, `DesignerSidebar`, and `CertificateDesigner` walkthrough flow.
- a34c757: Implement conditional Year-over-Year (YoY) comparison across the Statistics Dashboard, calculation utilities, table components, and executive PDF exporter:
  - Pure Statistical Logic & Calculators (`src/features/statistics/utils/statsCalculators.ts`):
    - `calculatePercentChange`: Computes percentage variation between current and previous periods with division-by-zero protection.
    - `partitionDataByYear`: Filters and partitions batch and member datasets across current and prior comparative years.
    - `calculateYoYComparison`: Computes comprehensive YoY metrics for KPIs, Regions, Districts, Scout Units, Demographics (Jóvenes vs Adultos), and Monthly Trends.
  - Reusable UI Components:
    - `YoYVariationBadge`: Renders color-coded indicator badges displaying positive (+green), negative (-red), and neutral (=slate) absolute and percentage variations.
  - Dashboard & Section Components (`src/features/statistics/components/`):
    - `StatKpiGrid`: Displays subtle YoY variation badges below Total Reconocimientos, Total Lotes, and Demografía metrics.
    - `RegionSummaryTable`: Conditionally renders comparative columns (`Total (${currentYear})`, `Año Anterior (${previousYear})`, `Variación`, `% del Total`).
    - `DistrictSummaryTable`: Conditionally renders comparative columns (`Región`, `Distrito`, `Total (${currentYear})`, `Año Anterior (${previousYear})`, `Variación`, `% del Total`).
    - `UnitDistributionCard`: Conditionally renders comparative columns for all Scout Units and Institutional categories.
    - `DemographicsDonut`: Adds comparative demographic table comparing current vs prior year metrics for young and adult members.
    - `MonthlyTrendChart`: Integrates dual-bar comparative SVG chart (current vs prior year) with chart legend, interactive tooltips, and comparative summary table.
    - Fallback Handling: Automatically falls back to standard single-year table views when historical data for the prior year is unavailable.
  - Executive PDF Report Exporter (`src/features/statistics/utils/statsPdfExport.ts`):
    - Generates comparative header subtitle `Reporte Comparativo Anual (${previousYear} vs ${currentYear})` when YoY data is present.
    - Generates multi-column comparative tables across Region, District, Unit, Demographics, and Monthly sections.
    - Draws comparative dual-bar vector histogram chart for monthly trend comparison.
  - Test Suites & Quality Gate:
    - Added unit test suites covering YoY calculations, PDF generator, hook updates, badge component, and multi-year dashboard integration.

### Patch Changes

- 3668b9a: Include unactive and pending members in generated batch PDF reports with status indicators and styling.
- 3668b9a: Fix modal body symmetric horizontal padding (px-6 py-5) and flex-scrolling with pinned header and footer action buttons, center content in batch detail top cards (min-h-[140px] my-auto), resolve table action dropdown clipping with dynamic popup positioning, restore PDF member list report generation in batch detail, enable dynamic recognition types and advanced date filtering (predefined periods, custom date ranges, and specific dates) in batch list filter modal, consolidate batch table row actions into a single 3-dots dropdown menu with smart positioning, remove duration subtitle from batch detail recognition card, standardize SuccessPage batch summary table columns (cédula, nombre completo, tipo, estatus, código rec., acciones) with recognition codes and BatchDetail design, apply soft pastel green styling to completed wizard step circles and smooth styling to active step in NewBatchWizard, refine Step 3 Review header indicators with subtle borders, remove Sparkles icon container from recognition code strategy bar, remove emoji from the Regenerar códigos button, and refactor the CertificateDesigner feature into a modular architecture with dedicated custom hooks (useCanvasDrag, useCanvasScale), an isolated imageProcessor service, and single-responsibility designer subcomponents.
- 3668b9a: Increase test coverage across backend scraper Cloud Functions and frontend batch components to exceed SonarCloud Quality Gate standards (>84% line coverage).
- 3668b9a: Resolve 32 SonarCloud code quality, reliability, and security findings across frontend components and cloud function handlers.

## 0.9.0

### Minor Changes

- b84852c: Implement US-04 (Visualización de Lotes / Issue #22) and US-05 (Detalle de Lote / Issue #23):
  - Created `BatchList` component with TanStack Table, top KPI statistics, dynamic active filter chips bar, row action controls, and batch deletion modal with instant state removal and toast notification.
  - Refined `BatchDetail` component with Top 3 KPI cards, member search filter, numbered pagination, CSV list export, client-side PDF generation, quick view modal, member editing modal, and batch deletion capability with redirect to `/lotes`.
  - Implemented `deleteBatch(batchId)` in Batches API to atomically delete the batch document and all associated scout members from Firestore via `writeBatch`.
  - Removed "Ruta de guardado local" banner, configuration modal, and associated API storage path functions.
  - Fixed Navbar active link selection using `end` prop on `/lotes` and `/lotes/nuevo` NavLinks to prevent prefix collisions.
  - Added comprehensive unit test suites for `BatchList`, `BatchDetail`, `Navbar`, and API with 100% test coverage.
- b84852c: Refactor database to split member names into first_names and last_names with custom splitting rules, update Step 3 wizard and detail views edit forms, configure SonarQube quality analysis in GitHub Actions, and automate changesets release planner and Firebase deployment.
- b84852c: # Milestone 3: Reconocimientos y Diseñador Visual de Diplomas (US-08A, US-08B, US-08C)

  Implementación completa del módulo de reconocimientos, diseñador visual interactivo de plantillas de certificados y motor dinámico de generación/exportación de diplomas en PDF:

  ### US-08A: Catálogo y CRUD de Tipos de Reconocimientos (Issue #26)

  - **Estructura del módulo**: Nuevo módulo dedicado bajo `src/features/recognitions/` estructurado con API, componentes, tipos Zod y servicios.
  - **Capa API de Firestore (`recognition_types`)**:
    - `getAllRecognitionTypes`: Retorna la lista ordenada de reconocimientos directamente desde Firestore (sin registros dummy/auto-seeding).
    - `getRecognitionTypeById`: Obtiene un tipo de reconocimiento específico con su plantilla asociada.
    - `createRecognitionType` y `updateRecognitionType`: Creación y actualización reactiva con generación de IDs normalizados (`sct-*`).
    - `deleteRecognitionType`: Eliminación física del documento en Firestore.
  - **Catálogo de Reconocimientos (`RecognitionCatalog`)**:
    - Tabla TanStack estilizada con columnas claras: _Nombre_, _Fecha de Creación_ y _Acciones_.
    - Barra de búsqueda en tiempo real y paginación reactiva.
    - Estado vacío (_Empty State_) amigable cuando no existen tipos registrados.
    - Botón de acceso directo al diseñador visual de plantillas por cada reconocimiento.
  - **Formularios y Modales Reactivos**:
    - `RecognitionFormModal`: Validación en tiempo real del nombre y manejo de errores.
    - `RecognitionDeleteModal`: Diálogo modal de confirmación de borrado seguro con alertas Toast integradas.
  - **Integración y Navegación**:
    - Selector dinámico de tipos de reconocimiento en el Paso 1 del Asistente de Creación de Lotes (`Step1Org`).
    - Pestaña de navegación en `Navbar` (`/reconocimientos`) y rutas configuradas en `App.tsx` (`/reconocimientos` y `/reconocimientos/:id/plantilla`).

  ### US-08B: Diseñador Visual de Plantillas de Certificados (Issue #39)

  - **Diseñador Visual (`CertificateDesigner`)**:
    - Layout ergonómico de 2 columnas: Lienzo principal de alta visibilidad a la izquierda (`lg:col-span-8`) y panel lateral de control a la derecha (`lg:col-span-4`).
    - Adaptación dinámica de _Aspect Ratio_ y resolución para cualquier imagen subida (16:9, 4:3, A4, etc.) sin distorsión ni barras negras (_letterboxing_).
    - Selector de modo compacto (Edición / Vista Previa) en la barra de herramientas.
    - Barra de especificaciones de formato y dimensiones de impresión ubicada debajo del lienzo para maximizar el espacio vertical.
  - **Panel de Control con 3 Pestañas (`Campos`, `Estilo`, `Fondo`)**:
    - Apertura automática del inspector de propiedades al hacer clic en cualquier campo en el lienzo o en la lista.
    - Ajuste interactivo de posición (X, Y en porcentajes), tamaño de fuente, alineación de texto (`left`, `center`, `right`), color y peso tipográfico (`normal`, `bold`).
    - Drag-and-drop intuitivo mediante eventos de puntero (_Pointer Events_) con límites restringidos dentro del canvas.
    - Subida de fondos personalizados con compresión cliente a WebP (0.88 de calidad) para optimizar almacenamiento en Firebase Free Tier.
    - Modo de vista previa con datos scout realistas simulados para validación inmediata.

  ### US-08C: Generación y Exportación Dinámica de Diplomas en PDF (Issue #40)

  - **Motor de PDF en Cliente (`certificatePdfGenerator.ts`)**:
    - Basado en `jsPDF` de alto rendimiento para exportaciones individuales (`downloadSingleCertificatePdf`) y por lote completo (`generateBatchCertificatesPdf`).
    - Normalización física de dimensiones de página a milímetros (`getNormalizedPageDimensions`): Mantiene proporciones exactas y escala adecuada para imágenes de alta resolución sin generar páginas sobredimensionadas ni textos microscópicos.
    - Paridad 1:1 WYSIWYG entre el canvas DOM y el documento PDF, calculando la escala de fuente en base a los puntos del documento y aplicando `baseline: 'middle'` en `doc.text()` para alineación vertical idéntica.
    - Interpolación completa de variables de scouts: `full_name`, `identity`, `recognition_name`, `region`, `district`, `group`, `issue_date` y `recognition_code`.
    - Filtro automático de miembros activos (`status === 'active'`) en la generación de diplomas de lotes completos.
    - Nomenclatura estandarizada de archivos descargados: `Diplomas_Lote_<batchId>_<slug>.pdf` y `Diploma_<scoutName>_<slug>.pdf`.
  - **Integración en la Interfaz de Usuario**:
    - Botón principal de descarga de diplomas del lote y botones individuales por fila en `BatchDetail`.
    - Botón de descarga de diplomas en las filas de `BatchList`.
    - Botón de descarga en la página de éxito (`SuccessPage`).

  ### Favicon & Identidad Visual

  - Reemplazo del favicon predeterminado por el logo oficial `CHIL_LOGO.png` en `public/CHIL_LOGO.png` y enlace en `index.html`.

  ### Calidad y Pruebas

  - 152/152 pruebas unitarias pasando en 22 suites de tests.
  - 0 errores de TypeScript (`tsc`) y 0 advertencias/errores de ESLint.

### Patch Changes

- b84852c: Include unactive and pending members in generated batch PDF reports with status indicators and styling.
- b84852c: Increase test coverage across backend scraper Cloud Functions and frontend batch components to exceed SonarCloud Quality Gate standards (>84% line coverage).
- b84852c: Resolve 32 SonarCloud code quality, reliability, and security findings across frontend components and cloud function handlers.

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
