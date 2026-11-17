# Recognitions Feature Blueprint

## System Overview
The `recognitions` feature subsystem manages Scout recognition types and their custom certificate templates: catalog CRUD over Firestore (`recognition_types`), image background processing into Firestore-safe data URLs, a WYSIWYG certificate template designer with undo/redo history and alignment snapping, and single/batch/ZIP certificate PDF generation (`jsPDF` + `JSZip`).

## Local Interface & Invariants
- **Public Barrel (`index.ts`)**:
  - `index.ts:*` re-exports `./types`, `./api`, `./services/certificatePdfGenerator`, `./components/RecognitionCatalog`, `./components/RecognitionFormModal`, `./components/RecognitionDeleteModal`, `./components/CertificateDesigner`, `./hooks`, and `./utils`.
  - **Invariants**: None (pure barrel re-export module).
  - **Side Effects**: None.

## Subdirectories & System Boundaries
- **API**: [`./api/README.md`](./api/README.md) — Firestore CRUD for `recognition_types` and client-side background image resizing/compression (`imageProcessor.ts`).
- **Components**: [`./components/README.md`](./components/README.md) — Recognition catalog (`RecognitionCatalog`), CRUD modals (`RecognitionFormModal`, `RecognitionDeleteModal`), certificate designer (`CertificateDesigner`), and nested designer UI ([`./components/designer/README.md`](./components/designer/README.md), [`./components/designer/sidebar/README.md`](./components/designer/sidebar/README.md)).
- **Hooks**: [`./hooks/README.md`](./hooks/README.md) — Canvas pointer dragging with alignment clamping (`useCanvasDrag`), DOM-measured WYSIWYG font scaling (`useCanvasScale`), and undo/redo template state reducer (`useDesignerReducer`).
- **Services**: [`./services/README.md`](./services/README.md) — Single-page, multi-page batch, and DEFLATE-compressed ZIP certificate PDF generation (`certificatePdfGenerator.ts`).
- **Types**: [`./types/README.md`](./types/README.md) — TypeScript interfaces, `RecognitionFieldKey` union, `AVAILABLE_TEMPLATE_FIELDS`, `MOCK_CERTIFICATE_DATA`, `DEFAULT_CERTIFICATE_TEMPLATE`, and `recognitionFormSchema` (Zod).
- **Utils**: [`./utils/README.md`](./utils/README.md) — Pure optical edge and snap guideline geometry (`snapGuidelines.ts`).

## Global Invariants
- **Firestore Size & User Scoping**: `api/index.ts:getAllRecognitionTypes` scopes queries by `userId ?? auth.currentUser?.uid` and returns `[]` when missing; `api/index.ts:saveCertificateTemplate` rejects `background_url` exceeding `MAX_FIRESTORE_TEMPLATE_BYTES` (`950_000`); `api/imageProcessor.ts:processBackgroundImageFile` rejects PDFs/non-images, targets `MAX_FIRESTORE_BACKGROUND_BASE64_LENGTH` (`750_000`) down to JPEG quality `0.5`, and falls back to A4 landscape (`297 × 210`) when `Image`/`document` are unavailable, loading fails, or the `100ms` timeout fires.
- **Designer State & Geometry**: `hooks/useDesignerReducer.ts:designerReducer` bounds undo history to `MAX_DESIGNER_HISTORY` (`20`) and commits pointer drags as a single history step via `COMMIT_FIELD_MOVE`; `hooks/useCanvasDrag.ts` enforces a `3px` drag threshold, uses adaptive pixel-based snap radii (`6px` X / `5px` Y clamped to `[0.4%, 0.85%]`) with `Alt`-key and `snapEnabled` bypass, and falls back oversized fields to `[2%, 98%]` clamping; `components/designer/DraggableField.tsx` omits position transitions (`transition-none`/`transition-colors` + `touch-none`), nudges within `[2, 98]`, and clamps `displayFontSizePx >= 8`.
- **Certificate PDF Eligibility & Layout**: `services/certificatePdfGenerator.ts` filters batch/ZIP exports to `'active' | 'exceptional'` members, normalizes page dimensions around a `297` mm long edge, interpolates hierarchy fields (`'-'` for missing/zero/`'no aplica'`), and falls back to `Scouts GT Planar` -> `helvetica` when the custom font is not registered.

## Global Side Effects
- **Cloud Firestore**: Reads and writes `recognition_types` documents (`getAllRecognitionTypes`, `getRecognitionTypeById`, `createRecognitionType`, `updateRecognitionType`, `deleteRecognitionType`, `saveCertificateTemplate`); `certificatePdfGenerator.ts:resolvePdfContext` delegates hierarchy fetches to `../../batches/api:getHierarchyData`.
- **Browser APIs & Downloads**: Uses `FileReader`, `Image`, `CanvasRenderingContext2D`, `ResizeObserver` (with `window` `'resize'` fallback), `fetch` (for `/fonts/Scouts-GT-Planar-Bold.ttf`), `window`/`document` pointer, keyboard, pointer-capture, and `focus` APIs, `setTimeout`/`clearTimeout`, `jsPDF.save`, `URL.createObjectURL`/`revokeObjectURL` (`triggerBlobDownload`), React Router `useNavigate`, and `console.error`.

## System Verification
- Run: `npm test -- --run`
