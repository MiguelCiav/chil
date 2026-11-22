# Recognitions API

## Overview
Manages CRUD persistence for recognition types and certificate templates in Firestore's `recognition_types` collection, and converts uploaded certificate background images and `.pdf` page-1 files into size-capped data URLs.

## Interface
- `index.ts:MAX_FIRESTORE_TEMPLATE_BYTES`: Constant (`950_000`) defining the maximum allowed character length for `template.background_url` before saving to Firestore.
- `index.ts:generateRecognitionId`: Pure function `(name: string) => string` that normalizes and slugifies a recognition name prefixed with `sct-`.
- `index.ts:getAllRecognitionTypes`: Async function `(userId?: string) => Promise<RecognitionType[]>` querying `recognition_types` for a user and returning them sorted.
- `index.ts:getRecognitionTypeById`: Async function `(id: string) => Promise<RecognitionType | null>` fetching a single recognition type document by ID.
- `index.ts:createRecognitionType`: Async function `(data: CreateRecognitionTypeParams, userId?: string) => Promise<RecognitionType>` creating a new recognition type document.
- `index.ts:updateRecognitionType`: Async function `(id: string, data: UpdateRecognitionTypeParams, userId?: string) => Promise<RecognitionType>` updating a recognition type while preserving existing `created_at` and `template`.
- `index.ts:deleteRecognitionType`: Async function `(id: string) => Promise<void>` deleting a recognition type document by ID.
- `index.ts:saveCertificateTemplate`: Async function `(recognitionId: string, template: CertificateTemplate) => Promise<void>` merging a `CertificateTemplate` onto an existing recognition type document.
- `index.ts:*`: Re-exports all symbols from `./imageProcessor`.
- `imageProcessor.ts:ProcessedBackgroundResult`: Interface describing the encoded `dataUrl`, dimensions (`width`, `height`, `naturalWidth`, `naturalHeight`, `normalizedWidth`, `normalizedHeight`), `aspectRatio`, `orientation` (`'landscape' | 'portrait'`), and optional diagnostics (`sourceType?: 'image' | 'pdf'`, `pageCount?: number`, `wasCompressedHeavily?: boolean`).
- `imageProcessor.ts:PdfPageRenderOutput`: Interface representing rendered PDF page 1 output (`canvas`, `ctx`, `naturalWidth`, `naturalHeight`, `exactRatio`, `pageCount`).
- `imageProcessor.ts:PdfPageRenderer`: Type `(file: File, maxWidth: number, maxHeight: number) => Promise<PdfPageRenderOutput>` for optional custom PDF rendering adapters.
- `imageProcessor.ts:ProcessBackgroundOptions`: Options object `{ pdfRenderer?: PdfPageRenderer }` accepted by `processBackgroundImageFile`.
- `imageProcessor.ts:ENCRYPTED_PDF_NOT_SUPPORTED_MESSAGE`: Spanish error message constant for password-protected `.pdf` uploads (`PasswordException`).
- `imageProcessor.ts:INVALID_PDF_MESSAGE`: Spanish error message constant for corrupted, unreadable, or zero-dimension `.pdf` uploads.
- `imageProcessor.ts:EMPTY_PDF_MESSAGE`: Spanish error message constant for `.pdf` files with zero pages (`numPages < 1`).
- `imageProcessor.ts:BACKGROUND_SIZE_LIMIT_EXCEEDED_MESSAGE`: Spanish error message constant when encoded output still exceeds `MAX_FIRESTORE_BACKGROUND_BASE64_LENGTH` (`750_000`) after all compression and downscale passes.
- `imageProcessor.ts:INVALID_IMAGE_FORMAT_MESSAGE`: Spanish error message constant for unsupported non-image/non-PDF background uploads.
- `imageProcessor.ts:MAX_FIRESTORE_BACKGROUND_BASE64_LENGTH`: Constant (`750_000`) capping encoded background data URL length below Firestore's 1 MB document limit.
- `imageProcessor.ts:processBackgroundImageFile`: Async function `(file: File, maxWidth = 1920, maxHeight = 1080, options?: ProcessBackgroundOptions) => Promise<ProcessedBackgroundResult>` converting `.pdf` page 1 (via dynamic `pdfjs-dist` or injected `pdfRenderer`) or raster images, resizing, and encoding within Firestore limits.

## Invariants
- `index.ts:generateRecognitionId`: Lowercases, NFD-normalizes, strips diacritics (`[\u0300-\u036f]`), replaces non-`[a-z0-9_-]` with `-`, collapses consecutive hyphens, trims edge hyphens, and falls back to `'custom'` if empty, returning `sct-${normalized || 'custom'}`.
- `index.ts:getAllRecognitionTypes`: Resolves `targetUserId` via `userId ?? auth.currentUser?.uid ?? ''`; returns `[]` immediately if empty or if the snapshot is empty, and returns `[]` on Firestore errors. Defaults missing `name` to `d.id` and missing `created_at` to `new Date().toISOString()`; sorts results by `name.localeCompare(b.name, 'es', { sensitivity: 'base' })`.
- `index.ts:getRecognitionTypeById`: Returns `null` if the document does not exist or if an error is thrown; defaults missing `name` to `snap.id` and `created_at` to `new Date().toISOString()`.
- `index.ts:createRecognitionType`: Trims `data.name`, generates ID via `generateRecognitionId(data.name)`, and resolves `user_id` via `data.user_id ?? userId ?? auth.currentUser?.uid ?? ''` (omitting `user_id` if empty).
- `index.ts:updateRecognitionType`: Fetches the existing document via `getRecognitionTypeById(id)`, trims `data.name`, preserves `existing?.created_at` (or falls back to current ISO timestamp) and `existing?.template`, and resolves `user_id` via `userId ?? existing?.user_id ?? auth.currentUser?.uid ?? ''` (omitting `user_id` if empty).
- `index.ts:saveCertificateTemplate`: Throws an `Error` in Spanish if `template.background_url` is truthy and `template.background_url.length > MAX_FIRESTORE_TEMPLATE_BYTES` (`950_000`).
- `imageProcessor.ts:processBackgroundImageFile`: Routes files with `file.type` `'application/pdf'` / `'application/x-pdf'` or `.pdf` filename (case-insensitive) to `processPdfBackgroundFile`, and rejects unsupported non-image MIME types with `INVALID_IMAGE_FORMAT_MESSAGE`; `FileReader.onerror` rejects with `new Error(extractErrorMessage(err))`.
- `imageProcessor.ts:renderPdfFirstPageWithPdfJs`: Rejects with `PDF_SSR_UNSUPPORTED_MESSAGE` when `document` is undefined and `CANVAS_2D_INIT_ERROR_MESSAGE` (`'No se pudo inicializar el lienzo 2D para procesar la imagen de fondo.'`) when `canvas.getContext('2d')` returns `null`; parses `file.arrayBuffer()` via lazy-imported `pdfjs-dist` with Vite local worker (`?url`), rejects zero-page PDFs with `EMPTY_PDF_MESSAGE` and invalid viewports (`<= 0`) with `INVALID_PDF_MESSAGE`, maps `PasswordException` to `ENCRYPTED_PDF_NOT_SUPPORTED_MESSAGE`, renders page 1 onto a `#ffffff`-filled canvas scaled uniformly within orientation-aware `(maxWidth, maxHeight)` passing `{ canvas, canvasContext, viewport }`, preserves unrounded `baseViewport.width / baseViewport.height` proportions, and cleans up `page.cleanup()`, `pdfDoc.cleanup()`, `loadingTask.destroy()`, and `releaseCanvas(renderCanvas)` on failure (`if (!renderSucceeded)`), while `processPdfBackgroundFile` calls `releaseCanvas(rendered.canvas)` in its `finally` block after encoding completes.
- `imageProcessor.ts:processBackgroundImageFile`: For raster images, falls back to A4 landscape defaults (`297x210`, `aspectRatio = Math.round((297 / 210) * 1000) / 1000`, `orientation: 'landscape'`, raw `dataUrl`) when `Image`/`document` are undefined, on `img.onerror`, on setup exception, or after a 100ms timeout (`isDone` guard); computes `orientation` (`exactRatio >= 1 ? 'landscape' : 'portrait'`), normalizes long edge to `297` mm, preserves `naturalWidth`/`naturalHeight` in `width`/`height` (falling back to `rawDataUrl` if `canvas.getContext('2d')` is `null`), rejects if `encodeNormalizedCanvas` throws, and zeroes `canvas` dimensions (`releaseCanvas`) in `finally`.
- `imageProcessor.ts:encodeNormalizedCanvas`: Preserves PNG with alpha only when `allowAlphaPng` is true, `mimeType` is `image/png` or `image/webp`, `hasAlphaTransparency` (stride 64 bytes, alpha `< 250`) is true, and PNG length `<= 750_000`; otherwise uses an opaque `#ffffff` canvas (`sourceCanvas` directly when `alreadyOpaqueWhite` is true, else a fresh `#ffffff` canvas), throws `CANVAS_2D_INIT_ERROR_MESSAGE` if a temporary compositing or scaled canvas `getContext('2d')` returns `null`, sweeps JPEG qualities `[0.85, 0.72, 0.6, 0.5, 0.4, 0.3]`, then uniform aspect-ratio-locked downscale factors `[0.85, 0.72, 0.6, 0.48, 0.36]` (`scaledHeight = Math.max(1, Math.round(scaledWidth / exactRatio))`) at qualities `[0.6, 0.45, 0.35]` marking `wasCompressedHeavily: true` if quality `< 0.6` or downscaled, releases temporary canvas dimensions (`releaseCanvas`) in `finally`, and throws `BACKGROUND_SIZE_LIMIT_EXCEEDED_MESSAGE` if all passes exceed `750_000`.

## Side Effects
- `index.ts:getAllRecognitionTypes`: Reads Firestore collection `recognition_types` via `getDocs(query(...))`; reads `auth.currentUser?.uid`; calls `console.error` on catch.
- `index.ts:getRecognitionTypeById`: Reads Firestore document `recognition_types/{id}` via `getDoc`; calls `console.error` on catch.
- `index.ts:createRecognitionType`: Writes Firestore document `recognition_types/{id}` via `setDoc`; reads `auth.currentUser?.uid`.
- `index.ts:updateRecognitionType`: Reads `recognition_types/{id}` via `getRecognitionTypeById` and overwrites it via `setDoc`; reads `auth.currentUser?.uid`.
- `index.ts:deleteRecognitionType`: Deletes Firestore document `recognition_types/{id}` via `deleteDoc`.
- `index.ts:saveCertificateTemplate`: Merges `{ template }` into Firestore document `recognition_types/{recognitionId}` via `setDoc(..., { merge: true })`.
- `imageProcessor.ts:processBackgroundImageFile`: Dynamically imports `pdfjs-dist` and local `pdf.worker.min.mjs?url` worker on `.pdf` uploads; uses `File.arrayBuffer()`, browser `FileReader.readAsDataURL`, `new Image()`, `setTimeout`/`clearTimeout` (100ms fallback), `document.createElement('canvas')`, and Canvas 2D context (`getImageData`, `fillRect`, `drawImage`, `toDataURL`).

## Verification
- Run: `npm test -- --run`
