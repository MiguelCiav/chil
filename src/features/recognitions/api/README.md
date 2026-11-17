# Recognitions API

## Overview
Manages CRUD persistence for recognition types and certificate templates in Firestore's `recognition_types` collection, and processes uploaded certificate background images into size-capped data URLs.

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
- `imageProcessor.ts:ProcessedBackgroundResult`: Interface describing the encoded `dataUrl`, dimensions (`width`, `height`, `naturalWidth`, `naturalHeight`, `normalizedWidth`, `normalizedHeight`), `aspectRatio`, and `orientation` (`'landscape' | 'portrait'`).
- `imageProcessor.ts:PDF_UPLOAD_NOT_SUPPORTED_MESSAGE`: Spanish error message constant for rejected PDF background uploads.
- `imageProcessor.ts:INVALID_IMAGE_FORMAT_MESSAGE`: Spanish error message constant for non-image background uploads.
- `imageProcessor.ts:MAX_FIRESTORE_BACKGROUND_BASE64_LENGTH`: Constant (`750_000`) capping encoded background data URL length below Firestore's 1 MB document limit.
- `imageProcessor.ts:processBackgroundImageFile`: Async function `(file: File, maxWidth = 1920, maxHeight = 1080) => Promise<ProcessedBackgroundResult>` reading, resizing, and encoding an image file.

## Invariants
- `index.ts:generateRecognitionId`: Lowercases, NFD-normalizes, strips diacritics (`[\u0300-\u036f]`), replaces non-`[a-z0-9_-]` with `-`, collapses consecutive hyphens, trims edge hyphens, and falls back to `'custom'` if empty, returning `sct-${normalized || 'custom'}`.
- `index.ts:getAllRecognitionTypes`: Resolves `targetUserId` via `userId ?? auth.currentUser?.uid ?? ''`; returns `[]` immediately if empty or if the snapshot is empty, and returns `[]` on Firestore errors. Defaults missing `name` to `d.id` and missing `created_at` to `new Date().toISOString()`; sorts results by `name.localeCompare(b.name, 'es', { sensitivity: 'base' })`.
- `index.ts:getRecognitionTypeById`: Returns `null` if the document does not exist or if an error is thrown; defaults missing `name` to `snap.id` and `created_at` to `new Date().toISOString()`.
- `index.ts:createRecognitionType`: Trims `data.name`, generates ID via `generateRecognitionId(data.name)`, and resolves `user_id` via `data.user_id ?? userId ?? auth.currentUser?.uid ?? ''` (omitting `user_id` if empty).
- `index.ts:updateRecognitionType`: Fetches the existing document via `getRecognitionTypeById(id)`, trims `data.name`, preserves `existing?.created_at` (or falls back to current ISO timestamp) and `existing?.template`, and resolves `user_id` via `userId ?? existing?.user_id ?? auth.currentUser?.uid ?? ''` (omitting `user_id` if empty).
- `index.ts:saveCertificateTemplate`: Throws an `Error` in Spanish if `template.background_url` is truthy and `template.background_url.length > MAX_FIRESTORE_TEMPLATE_BYTES` (`950_000`).
- `imageProcessor.ts:processBackgroundImageFile`: Rejects with `PDF_UPLOAD_NOT_SUPPORTED_MESSAGE` if `file.type === 'application/pdf'` or `file.name` ends with `.pdf` (case-insensitive), and rejects with `INVALID_IMAGE_FORMAT_MESSAGE` if `!file.type || !file.type.startsWith('image/')`; `FileReader.onerror` rejects with `new Error(extractErrorMessage(err))`.
- `imageProcessor.ts:processBackgroundImageFile`: Falls back to A4 landscape defaults (`297x210`, `aspectRatio = Math.round((297 / 210) * 1000) / 1000`, `orientation: 'landscape'`, raw `dataUrl`) when `Image`/`document` are undefined, on `img.onerror`, on exception, or after a 100ms timeout (`isDone` guard). Computes `orientation` as `'landscape'` when `naturalWidth >= naturalHeight` else `'portrait'`; normalizes long edge to `297` mm and scales only the encoded canvas within `(maxWidth, maxHeight)` (swapping bounds for portrait) while preserving `naturalWidth`/`naturalHeight` in `width`/`height` (falling back to `rawDataUrl` with computed dimensions if `canvas.getContext('2d')` returns `null`).
- `imageProcessor.ts:encodeNormalizedCanvas`: Preserves PNG with alpha only if `mimeType` is `image/png` or `image/webp`, `hasAlphaTransparency` (sampling every 16th pixel / stride 64 bytes for alpha `< 250`) is true, and PNG data URL length `<= MAX_FIRESTORE_BACKGROUND_BASE64_LENGTH` (`750_000`); otherwise composites onto `#ffffff` and tries JPEG qualities `[0.82, 0.72, 0.6, 0.5]` until `<= 750_000` (falling back to `0.5`).

## Side Effects
- `index.ts:getAllRecognitionTypes`: Reads Firestore collection `recognition_types` via `getDocs(query(...))`; reads `auth.currentUser?.uid`; calls `console.error` on catch.
- `index.ts:getRecognitionTypeById`: Reads Firestore document `recognition_types/{id}` via `getDoc`; calls `console.error` on catch.
- `index.ts:createRecognitionType`: Writes Firestore document `recognition_types/{id}` via `setDoc`; reads `auth.currentUser?.uid`.
- `index.ts:updateRecognitionType`: Reads `recognition_types/{id}` via `getRecognitionTypeById` and overwrites it via `setDoc`; reads `auth.currentUser?.uid`.
- `index.ts:deleteRecognitionType`: Deletes Firestore document `recognition_types/{id}` via `deleteDoc`.
- `index.ts:saveCertificateTemplate`: Merges `{ template }` into Firestore document `recognition_types/{recognitionId}` via `setDoc(..., { merge: true })`.
- `imageProcessor.ts:processBackgroundImageFile`: Uses browser `FileReader.readAsDataURL`, `new Image()`, `setTimeout`/`clearTimeout` (100ms fallback), `document.createElement('canvas')`, and Canvas 2D context (`getImageData`, `fillRect`, `drawImage`, `toDataURL`).

## Verification
- Run: `npm test -- --run`
