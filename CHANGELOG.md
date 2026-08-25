# chil

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
