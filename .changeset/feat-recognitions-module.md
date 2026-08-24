---
"chil": minor
---

# Milestone 3: Reconocimientos y Diseñador Visual de Diplomas (US-08A, US-08B, US-08C)

Implementación completa del módulo de reconocimientos, diseñador visual interactivo de plantillas de certificados y motor dinámico de generación/exportación de diplomas en PDF:

### US-08A: Catálogo y CRUD de Tipos de Reconocimientos (Issue #26)
- **Estructura del módulo**: Nuevo módulo dedicado bajo `src/features/recognitions/` estructurado con API, componentes, tipos Zod y servicios.
- **Capa API de Firestore (`recognition_types`)**:
  - `getAllRecognitionTypes`: Retorna la lista ordenada de reconocimientos directamente desde Firestore (sin registros dummy/auto-seeding).
  - `getRecognitionTypeById`: Obtiene un tipo de reconocimiento específico con su plantilla asociada.
  - `createRecognitionType` y `updateRecognitionType`: Creación y actualización reactiva con generación de IDs normalizados (`sct-*`).
  - `deleteRecognitionType`: Eliminación física del documento en Firestore.
- **Catálogo de Reconocimientos (`RecognitionCatalog`)**:
  - Tabla TanStack estilizada con columnas claras: *Nombre*, *Fecha de Creación* y *Acciones*.
  - Barra de búsqueda en tiempo real y paginación reactiva.
  - Estado vacío (*Empty State*) amigable cuando no existen tipos registrados.
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
  - Adaptación dinámica de *Aspect Ratio* y resolución para cualquier imagen subida (16:9, 4:3, A4, etc.) sin distorsión ni barras negras (*letterboxing*).
  - Selector de modo compacto (Edición / Vista Previa) en la barra de herramientas.
  - Barra de especificaciones de formato y dimensiones de impresión ubicada debajo del lienzo para maximizar el espacio vertical.
- **Panel de Control con 3 Pestañas (`Campos`, `Estilo`, `Fondo`)**:
  - Apertura automática del inspector de propiedades al hacer clic en cualquier campo en el lienzo o en la lista.
  - Ajuste interactivo de posición (X, Y en porcentajes), tamaño de fuente, alineación de texto (`left`, `center`, `right`), color y peso tipográfico (`normal`, `bold`).
  - Drag-and-drop intuitivo mediante eventos de puntero (*Pointer Events*) con límites restringidos dentro del canvas.
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
