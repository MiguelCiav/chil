# Recognitions Services

## Overview
Generates single-page, multi-page batch, and ZIP-bundled individual certificate PDFs using `jsPDF` and `JSZip`, handling custom font loading, template layout normalization, variable interpolation, and browser downloads.

## Interface
- `certificatePdfGenerator.ts:CERTIFICATE_BG_IMAGE_ALIAS`: Constant `'cert_bg_image'` used as the `jsPDF.addImage` alias.
- `certificatePdfGenerator.ts:SCOUTS_PLANAR_FONT_FILE`: Constant `'Scouts-GT-Planar-Bold.ttf'`.
- `certificatePdfGenerator.ts:SCOUTS_PLANAR_FONT_NAME`: Constant `'Scouts GT Planar'`.
- `certificatePdfGenerator.ts:SCOUTS_PLANAR_FONT_URL`: Constant `'/fonts/Scouts-GT-Planar-Bold.ttf'`.
- `certificatePdfGenerator.ts:HierarchyData`: Interface `{ regions: Region[]; districts: District[]; groups: ScoutGroup[] }`.
- `certificatePdfGenerator.ts:BatchGenerationProgress`: Interface `{ current: number; total: number; percentage: number }`.
- `certificatePdfGenerator.ts:BatchGenerationOptions`: Interface `{ onProgress?: ...; signal?: AbortSignal; chunkSize?: number; bucketSlug?: string }`.
- `certificatePdfGenerator.ts:SingleCertificateParams`: Interface `{ member: ScoutMember; batch: Batch; recognition?: RecognitionType | null; hierarchy?: HierarchyData }`.
- `certificatePdfGenerator.ts:BatchCertificatesParams`: Interface `{ batch: Batch; members: ScoutMember[]; recognition?: RecognitionType | null; hierarchy?: HierarchyData; onProgress?: ...; signal?: AbortSignal; bucketSlug?: string }`.
- `certificatePdfGenerator.ts:NormalizedPageDimensions`: Interface `{ width: number; height: number; orientation: 'landscape' | 'portrait'; aspectRatio: number }`.
- `certificatePdfGenerator.ts:setCachedScoutsPlanarFontBase64`: Setter `(base64: string | null) => void` for the module-level cached font base64 string.
- `certificatePdfGenerator.ts:getCachedScoutsPlanarFontBase64`: Getter `() => string | null` for the cached font base64 string.
- `certificatePdfGenerator.ts:arrayBufferToBase64`: Helper `(buffer: ArrayBuffer) => string` converting binary font buffers to base64 in 32KB (`0x8000`) chunks.
- `certificatePdfGenerator.ts:loadScoutsPlanarFontBase64`: Async function `(fontUrl = SCOUTS_PLANAR_FONT_URL) => Promise<string | null>` fetching and caching the TTF font as base64.
- `certificatePdfGenerator.ts:registerCustomFonts`: Function `(doc: jsPDF, fontBase64?: string | null) => boolean` registering `Scouts GT Planar` (`bold` and `normal`) into a `jsPDF` instance's VFS.
- `certificatePdfGenerator.ts:hexToRgb`: Pure function `(hex?: string) => { r: number; g: number; b: number }` parsing 3- or 6-char hex colors.
- `certificatePdfGenerator.ts:formatIssueDate`: Pure function `(dateStr?: string) => string` formatting ISO dates to Spanish short UTC format (e.g. `'12 Oct 2026'`).
- `certificatePdfGenerator.ts:slugify`: Pure function `(text: string) => string` normalizing text into underscore-separated ASCII slugs.
- `certificatePdfGenerator.ts:getNormalizedPageDimensions`: Pure function `(template?: CertificateTemplate) => NormalizedPageDimensions` computing physical mm dimensions.
- `certificatePdfGenerator.ts:getImageFormatFromUrl`: Pure function `(url: string) => 'PNG' | 'JPEG' | 'WEBP' | null` inferring image format from data URLs or extensions.
- `certificatePdfGenerator.ts:interpolateCertificateVariables`: Pure function mapping member, batch, recognition, and hierarchy data to `Record<RecognitionFieldKey, string>`.
- `certificatePdfGenerator.ts:resolveFieldsToRender`: Pure function `(template?: CertificateTemplate) => RecognitionFieldConfig[]` returning template fields or defaults from `AVAILABLE_TEMPLATE_FIELDS`.
- `certificatePdfGenerator.ts:getPdfFontFamily`: Pure function mapping configured font names to `'helvetica' | 'times' | 'courier' | 'Scouts GT Planar'`.
- `certificatePdfGenerator.ts:applyFieldTypography`: Function `(doc: jsPDF, field: RecognitionFieldConfig, customFontRegistered?: boolean) => void` setting font, size, and RGB color on `doc`.
- `certificatePdfGenerator.ts:renderCertificatePage`: Function rendering background/border and interpolated fields onto a `jsPDF` page.
- `certificatePdfGenerator.ts:generateSingleCertificatePdf`: Async function `(params: SingleCertificateParams) => Promise<jsPDF>` creating and rendering a single-page `jsPDF`.
- `certificatePdfGenerator.ts:downloadSingleCertificatePdf`: Async function `(params: SingleCertificateParams) => Promise<string>` generating, saving (`doc.save`), and returning the filename.
- `certificatePdfGenerator.ts:generateBatchCertificatesPdf`: Async function `(params: BatchCertificatesParams, options?: BatchGenerationOptions) => Promise<string>` generating and saving a multi-page PDF.
- `certificatePdfGenerator.ts:generateBatchCertificatesZip`: Async function `(params: BatchCertificatesParams, options?: BatchGenerationOptions) => Promise<string>` generating individual PDFs into a DEFLATE-compressed `.zip` and triggering download.

## Invariants
- `certificatePdfGenerator.ts:hexToRgb`: Defaults to `{ r: 33, g: 33, b: 33 }` when `hex` is missing, length after `#` removal (and 3-char expansion) is not 6, or `Number.parseInt` yields `NaN`.
- `certificatePdfGenerator.ts:formatIssueDate`: Defaults to `'12 Oct 2026'` if `dateStr` is falsy; returns `dateStr` unchanged if `new Date(dateStr)` is invalid; formats using UTC day/month/year.
- `certificatePdfGenerator.ts:getNormalizedPageDimensions`: Resolves aspect ratio from `template.aspect_ratio`, then `page_width / page_height`, then `210 / 297` (if `orientation === 'portrait'`) or `297 / 210`; sets `landscape` (`ar >= 1`, `width = 297`, `height = Math.round((297 / ar) * 100) / 100`) or `portrait` (`ar < 1`, `height = 297`, `width = Math.round((297 * ar) * 100) / 100`).
- `certificatePdfGenerator.ts:getImageFormatFromUrl`: Returns `null` for empty strings, unsupported `data:` MIME types, or `.pdf` URLs; defaults unrecognized non-data URLs to `'JPEG'`.
- `certificatePdfGenerator.ts:drawCertificateBackground`: Falls back to `drawStandardScoutBorder` if `backgroundUrl` is empty, format is `null`, or `doc.addImage` throws.
- `certificatePdfGenerator.ts:interpolateCertificateVariables`: Resolves hierarchy IDs with `member.<field>_id ?? batch.<field>_id`, returning `'-'` when ID is `0`/falsy, not found, or named `'no aplica'` (case-insensitive); defaults `recognition_name` to `recognition?.name ?? batch.recognition_type ?? 'Reconocimiento Scout'`; defaults `recognition_code` to `REC-${String(batch.id).padStart(3, '0')}-${last4}`.
- `certificatePdfGenerator.ts:getPdfFontFamily`: Maps `'times'` to `'times'`, `'courier'` to `'courier'`, and `'scouts-gt-planar-bold'` / `'Scouts GT Planar'` to `'Scouts GT Planar'` only when `customFontRegistered` is true (falling back to `'helvetica'`); `'noto-sans'`, `'helvetica'`, and unknown values map to `'helvetica'`.
- `certificatePdfGenerator.ts:getFontWeight`: Forces `'bold'` (unless `'italic'`) when `fontFamily` is `'scouts-gt-planar-bold'` or `'Scouts GT Planar'`.
- `certificatePdfGenerator.ts:drawSingleField`: Converts percentage coordinates `(field.x, field.y)` to mm rounded to 2 decimal places (`Math.round(((field.x / 100) * width) * 100) / 100`) with `baseline: 'middle'`.
- `certificatePdfGenerator.ts:generateBatchCertificatesPdf & generateBatchCertificatesZip`: Filters `members` to `status === 'active' || status === 'exceptional'`, throwing a Spanish `Error` if none are eligible; clamps `chunkSize` via `Math.max(1, options?.chunkSize ?? 5)` and yields to the main thread (`setTimeout(resolve, 0)`) every `chunkSize` items; cancellation throws a Spanish `DOMException(..., 'AbortError')` (or `Error` with `name = 'AbortError'`).
- `certificatePdfGenerator.ts:applyFieldTypography & renderCertificatePage`: `applyFieldTypography` checks `docsWithCustomFont` or `doc.getFontList?.()?.[SCOUTS_PLANAR_FONT_NAME]` when `customFontRegistered` is omitted; `renderCertificatePage` auto-registers `cachedScoutsPlanarFontBase64` onto `doc` if not yet in `docsWithCustomFont`.
- `certificatePdfGenerator.ts:downloadSingleCertificatePdf, generateBatchCertificatesPdf & generateBatchCertificatesZip`: Sanitizes `member.identity` (`[^a-zA-Z0-9_-]` -> `_`) and names outputs `Reconocimiento_${sanitizedIdentity}_Lote_${batch.id}_${slug}.pdf` (single, using `params.recognition?.name ?? params.batch.recognition_type ?? 'Reconocimiento'`, and ZIP entries, using `resolvedRecognition?.name ?? batch.recognition_type ?? 'Reconocimiento'`), `Reconocimientos_Lote_${batch.id}_${slug}.pdf` (multi-page batch, falling back to `'Reconocimientos'`), and `Reconocimientos_Lote_${batch.id}_${slug}${cleanBucketSlug ? '_' + cleanBucketSlug : ''}.zip` (ZIP archive, using DEFLATE level `6` and `slugify(rawBucketSlug) || 'grupo'` when `rawBucketSlug` is non-empty).

## Side Effects
- `certificatePdfGenerator.ts:loadScoutsPlanarFontBase64`: Performs `fetch(fontUrl)` and mutates module-level `cachedScoutsPlanarFontBase64`.
- `certificatePdfGenerator.ts:registerCustomFonts`: Mutates `doc` VFS (`addFileToVFS`, `addFont`) and module-level `WeakSet` `docsWithCustomFont`; `generateSingleCertificatePdf` and `generateBatchCertificatesPdf` lazily invoke `ensureCustomFontsRegistered` (`loadScoutsPlanarFontBase64`) when `addFileToVFS`/`addFont` are functions and cache is empty, whereas `generateBatchCertificatesZip` calls `loadScoutsPlanarFontBase64()` directly before the member loop when `!cachedScoutsPlanarFontBase64` and then calls `registerCustomFonts(doc, cachedScoutsPlanarFontBase64)` per member `jsPDF` instance.
- `certificatePdfGenerator.ts:resolvePdfContext`: Calls `getHierarchyData()` (from `../../batches/api`) when `hierarchy` is omitted, and `getRecognitionTypeById(batch.recognition_type)` (Firestore read) when `recognition === undefined` and `batch.recognition_type` is set.
- `certificatePdfGenerator.ts:generateSingleCertificatePdf & downloadSingleCertificatePdf`: Instantiates `jsPDF`, renders page, and (`downloadSingleCertificatePdf`) triggers PDF download via `doc.save(fileName)`.
- `certificatePdfGenerator.ts:generateBatchCertificatesPdf`: Instantiates `jsPDF`, adds pages, checks `AbortSignal` (`throwIfAborted`) between steps/chunks, invokes `onProgress`, yields via `setTimeout(0)`, and triggers download via `doc.save(fileName)`.
- `certificatePdfGenerator.ts:generateBatchCertificatesZip`: Instantiates `JSZip` and per-member `jsPDF` instances, checks `AbortSignal` before/during/after loops and ZIP generation, invokes `onProgress`, yields via `setTimeout(0)`, generates a `Blob`, and triggers download via DOM `<a download>` + `window.URL.createObjectURL`/`revokeObjectURL` (`triggerBlobDownload`).

## Verification
- Run: `npm test -- --run`
