import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

export interface ProcessedBackgroundResult {
  dataUrl: string;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  normalizedWidth: number;
  normalizedHeight: number;
  aspectRatio: number;
  orientation: 'landscape' | 'portrait';
  sourceType?: 'image' | 'pdf';
  pageCount?: number;
  wasCompressedHeavily?: boolean;
}

export interface PdfPageRenderOutput {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  naturalWidth: number;
  naturalHeight: number;
  exactRatio: number;
  pageCount: number;
}

export type PdfPageRenderer = (
  file: File,
  maxWidth: number,
  maxHeight: number
) => Promise<PdfPageRenderOutput>;

export interface ProcessBackgroundOptions {
  pdfRenderer?: PdfPageRenderer;
}

export const ENCRYPTED_PDF_NOT_SUPPORTED_MESSAGE =
  'El archivo PDF está protegido con contraseña. Por favor sube un PDF sin contraseña o una imagen PNG/JPG/WebP.';

export const INVALID_PDF_MESSAGE =
  'No se pudo procesar el archivo PDF. Asegúrate de que no esté dañado o sube una imagen PNG/JPG/WebP.';

export const EMPTY_PDF_MESSAGE = 'El archivo PDF no contiene páginas.';

export const BACKGROUND_SIZE_LIMIT_EXCEEDED_MESSAGE =
  'El archivo supera el límite de tamaño permitido incluso tras comprimirlo. Usa una imagen PNG o JPG más ligera.';

export const INVALID_IMAGE_FORMAT_MESSAGE =
  'Formato de archivo no soportado. Por favor suba una imagen PNG, JPG o WebP.';

const CANVAS_2D_INIT_ERROR_MESSAGE =
  'No se pudo inicializar el lienzo 2D para procesar la imagen de fondo.';

const PDF_SSR_UNSUPPORTED_MESSAGE = 'El entorno actual no soporta la conversión de PDF.';

/**
 * Maximum safe Base64 character length (~750 KB) to guarantee the serialized
 * template stays well below Cloud Firestore's 1 MB (1,048,576 bytes) document limit.
 */
export const MAX_FIRESTORE_BACKGROUND_BASE64_LENGTH = 750_000;

interface EncodeCanvasOptions {
  mimeType: string;
  allowAlphaPng: boolean;
  alreadyOpaqueWhite: boolean;
  exactRatio: number;
}

interface EncodedCanvasOutput {
  dataUrl: string;
  wasCompressedHeavily: boolean;
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  return 'Error al procesar la imagen';
}

function releaseCanvas(canvas: HTMLCanvasElement | null | undefined): void {
  if (!canvas) return;
  canvas.width = 0;
  canvas.height = 0;
}

function getOrientationBounds(
  exactRatio: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const isPortrait = exactRatio < 1;
  return {
    width: isPortrait ? Math.min(maxWidth, maxHeight) : maxWidth,
    height: isPortrait ? Math.max(maxWidth, maxHeight) : maxHeight
  };
}

function computeNormalizedGeometry(exactRatio: number): {
  aspectRatio: number;
  orientation: 'landscape' | 'portrait';
  normalizedWidth: number;
  normalizedHeight: number;
} {
  const aspectRatio = Math.round(exactRatio * 1000) / 1000;
  const orientation: 'landscape' | 'portrait' = exactRatio >= 1 ? 'landscape' : 'portrait';
  if (orientation === 'landscape') {
    return {
      aspectRatio,
      orientation,
      normalizedWidth: 297,
      normalizedHeight: Math.round((297 / exactRatio) * 100) / 100
    };
  }
  return {
    aspectRatio,
    orientation,
    normalizedWidth: Math.round(297 * exactRatio * 100) / 100,
    normalizedHeight: 297
  };
}

/**
 * Samples pixel alpha channel on a 2D canvas context to detect transparency.
 */
function hasAlphaTransparency(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): boolean {
  if (typeof ctx.getImageData !== 'function') {
    return false;
  }
  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    if (!data || data.length === 0) {
      return false;
    }
    // Sample every 16th pixel (stride = 64 bytes) for fast transparency detection
    for (let i = 3; i < data.length; i += 64) {
      if (data[i] < 250) {
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

function paintWhiteAndDraw(
  ctx: CanvasRenderingContext2D,
  sourceCanvas: HTMLCanvasElement,
  width: number,
  height: number
): void {
  if (typeof ctx.fillRect === 'function') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }
  if (typeof ctx.drawImage === 'function') {
    ctx.drawImage(sourceCanvas, 0, 0, width, height);
  }
}

function encodeCanvasAsJpeg(canvas: HTMLCanvasElement, quality: number): string {
  try {
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return '';
  }
}

function sweepJpegQualities(
  canvas: HTMLCanvasElement,
  qualities: readonly number[],
  forceHeavy: boolean
): EncodedCanvasOutput | null {
  for (const quality of qualities) {
    const encoded = encodeCanvasAsJpeg(canvas, quality);
    if (encoded && encoded.length <= MAX_FIRESTORE_BACKGROUND_BASE64_LENGTH) {
      return {
        dataUrl: encoded,
        wasCompressedHeavily: forceHeavy || quality < 0.6
      };
    }
  }
  return null;
}

function tryEncodeAlphaPng(
  sourceCanvas: HTMLCanvasElement,
  sourceCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mimeType: string,
  allowAlphaPng: boolean
): EncodedCanvasOutput | null {
  const mightHaveAlpha = allowAlphaPng && (mimeType === 'image/png' || mimeType === 'image/webp');
  if (!mightHaveAlpha || !hasAlphaTransparency(sourceCtx, width, height)) {
    return null;
  }
  try {
    const pngDataUrl = sourceCanvas.toDataURL('image/png');
    if (
      pngDataUrl?.startsWith('data:image/png') &&
      pngDataUrl.length <= MAX_FIRESTORE_BACKGROUND_BASE64_LENGTH
    ) {
      return { dataUrl: pngDataUrl, wasCompressedHeavily: false };
    }
  } catch {
    // Fallback to JPEG encoding
  }
  return null;
}

function sweepDownscaledJpeg(
  opaqueCanvas: HTMLCanvasElement,
  width: number,
  exactRatio: number
): EncodedCanvasOutput | null {
  const scaleFactors = [0.85, 0.72, 0.6, 0.48, 0.36];
  const downscaleQualities = [0.6, 0.45, 0.35];

  for (const scale of scaleFactors) {
    const scaledWidth = Math.max(1, Math.round(width * scale));
    const scaledHeight = Math.max(1, Math.round(scaledWidth / exactRatio));
    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = scaledWidth;
    scaledCanvas.height = scaledHeight;
    const scaledCtx = scaledCanvas.getContext('2d');
    if (!scaledCtx) {
      throw new Error(CANVAS_2D_INIT_ERROR_MESSAGE);
    }

    try {
      paintWhiteAndDraw(scaledCtx, opaqueCanvas, scaledWidth, scaledHeight);
      const scaledResult = sweepJpegQualities(scaledCanvas, downscaleQualities, true);
      if (scaledResult) {
        return scaledResult;
      }
    } finally {
      releaseCanvas(scaledCanvas);
    }
  }
  return null;
}

/**
 * Encodes canvas into a jsPDF-compatible JPEG or PNG data URL while capping
 * the output size below Firestore's 1 MB document limit.
 */
function encodeNormalizedCanvas(
  sourceCanvas: HTMLCanvasElement,
  sourceCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: EncodeCanvasOptions
): EncodedCanvasOutput {
  const { mimeType, allowAlphaPng, alreadyOpaqueWhite, exactRatio } = options;
  const alphaResult = tryEncodeAlphaPng(
    sourceCanvas,
    sourceCtx,
    width,
    height,
    mimeType,
    allowAlphaPng
  );
  if (alphaResult) {
    return alphaResult;
  }

  let opaqueCanvas = sourceCanvas;
  let tempOpaqueCanvas: HTMLCanvasElement | null = null;

  if (!alreadyOpaqueWhite) {
    tempOpaqueCanvas = document.createElement('canvas');
    tempOpaqueCanvas.width = width;
    tempOpaqueCanvas.height = height;
    const tempCtx = tempOpaqueCanvas.getContext('2d');
    if (!tempCtx) {
      throw new Error(CANVAS_2D_INIT_ERROR_MESSAGE);
    }
    paintWhiteAndDraw(tempCtx, sourceCanvas, width, height);
    opaqueCanvas = tempOpaqueCanvas;
  }

  try {
    const primaryQualities = [0.85, 0.72, 0.6, 0.5, 0.4, 0.3];
    const primaryResult = sweepJpegQualities(opaqueCanvas, primaryQualities, false);
    if (primaryResult) {
      return primaryResult;
    }

    const downscaledResult = sweepDownscaledJpeg(opaqueCanvas, width, exactRatio);
    if (downscaledResult) {
      return downscaledResult;
    }

    throw new Error(BACKGROUND_SIZE_LIMIT_EXCEEDED_MESSAGE);
  } finally {
    releaseCanvas(tempOpaqueCanvas);
  }
}

async function renderPdfFirstPageWithPdfJs(
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<PdfPageRenderOutput> {
  if (typeof document === 'undefined') {
    throw new TypeError(PDF_SSR_UNSUPPORTED_MESSAGE);
  }

  const [pdfjs, workerModule] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;

  let loadingTask: PDFDocumentLoadingTask | null = null;
  let pdfDoc: PDFDocumentProxy | null = null;
  let page: PDFPageProxy | null = null;
  let renderCanvas: HTMLCanvasElement | null = null;
  let renderSucceeded = false;

  try {
    const buffer = await file.arrayBuffer();
    loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
    pdfDoc = await loadingTask.promise;
    const pageCount = pdfDoc.numPages;
    if (pageCount < 1) {
      throw new Error(EMPTY_PDF_MESSAGE);
    }

    page = await pdfDoc.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    if (baseViewport.width <= 0 || baseViewport.height <= 0) {
      throw new Error(INVALID_PDF_MESSAGE);
    }

    const exactRatio = baseViewport.width / baseViewport.height;
    const naturalWidth = Math.max(1, Math.round(baseViewport.width));
    const naturalHeight = Math.max(1, Math.round(baseViewport.height));
    const bounds = getOrientationBounds(exactRatio, maxWidth, maxHeight);
    const renderScale = Math.min(bounds.width / baseViewport.width, bounds.height / baseViewport.height);
    const renderViewport = page.getViewport({ scale: renderScale });

    renderCanvas = document.createElement('canvas');
    renderCanvas.width = Math.max(1, Math.round(renderViewport.width));
    renderCanvas.height = Math.max(1, Math.round(renderViewport.height));

    const ctx = renderCanvas.getContext('2d');
    if (!ctx) {
      throw new Error(CANVAS_2D_INIT_ERROR_MESSAGE);
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);

    await page.render({
      canvas: renderCanvas,
      canvasContext: ctx,
      viewport: renderViewport
    }).promise;

    renderSucceeded = true;
    return {
      canvas: renderCanvas,
      ctx,
      naturalWidth,
      naturalHeight,
      exactRatio,
      pageCount
    };
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message === EMPTY_PDF_MESSAGE ||
        err.message === INVALID_PDF_MESSAGE ||
        err.message === CANVAS_2D_INIT_ERROR_MESSAGE)
    ) {
      throw err;
    }

    const errName =
      err && typeof err === 'object' && 'name' in err ? String((err as { name: unknown }).name) : '';
    if (err instanceof pdfjs.PasswordException || errName === 'PasswordException') {
      throw new Error(ENCRYPTED_PDF_NOT_SUPPORTED_MESSAGE, { cause: err });
    }

    throw new Error(INVALID_PDF_MESSAGE, { cause: err });
  } finally {
    page?.cleanup();
    await pdfDoc?.cleanup?.();
    await loadingTask?.destroy?.();
    if (!renderSucceeded) {
      releaseCanvas(renderCanvas);
    }
  }
}

async function processPdfBackgroundFile(
  file: File,
  maxWidth: number,
  maxHeight: number,
  options?: ProcessBackgroundOptions
): Promise<ProcessedBackgroundResult> {
  const renderer = options?.pdfRenderer ?? renderPdfFirstPageWithPdfJs;
  const rendered = await renderer(file, maxWidth, maxHeight);
  try {
    const encodeWidth = rendered.canvas.width || rendered.naturalWidth;
    const encodeHeight = rendered.canvas.height || rendered.naturalHeight;
    const { dataUrl, wasCompressedHeavily } = encodeNormalizedCanvas(
      rendered.canvas,
      rendered.ctx,
      encodeWidth,
      encodeHeight,
      {
        mimeType: 'image/jpeg',
        allowAlphaPng: false,
        alreadyOpaqueWhite: true,
        exactRatio: rendered.exactRatio
      }
    );
    const geometry = computeNormalizedGeometry(rendered.exactRatio);

    return {
      dataUrl,
      width: rendered.naturalWidth,
      height: rendered.naturalHeight,
      naturalWidth: rendered.naturalWidth,
      naturalHeight: rendered.naturalHeight,
      ...geometry,
      sourceType: 'pdf',
      pageCount: rendered.pageCount,
      wasCompressedHeavily
    };
  } finally {
    releaseCanvas(rendered.canvas);
  }
}

export async function processBackgroundImageFile(
  file: File,
  maxWidth = 1920,
  maxHeight = 1080,
  options?: ProcessBackgroundOptions
): Promise<ProcessedBackgroundResult> {
  const lowerName = file.name?.toLowerCase() ?? '';
  if (
    file.type === 'application/pdf' ||
    file.type === 'application/x-pdf' ||
    lowerName.endsWith('.pdf')
  ) {
    return processPdfBackgroundFile(file, maxWidth, maxHeight, options);
  }

  return new Promise((resolve, reject) => {
    if (!file.type?.startsWith('image/')) {
      reject(new Error(INVALID_IMAGE_FORMAT_MESSAGE));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      const defaultGeometry = computeNormalizedGeometry(297 / 210);
      const fallbackResult: ProcessedBackgroundResult = {
        dataUrl: rawDataUrl,
        width: 297,
        height: 210,
        naturalWidth: 297,
        naturalHeight: 210,
        normalizedWidth: 297,
        normalizedHeight: 210,
        aspectRatio: defaultGeometry.aspectRatio,
        orientation: 'landscape',
        sourceType: 'image',
        wasCompressedHeavily: false
      };

      if (typeof Image === 'undefined' || typeof document === 'undefined') {
        resolve(fallbackResult);
        return;
      }

      try {
        const img = new Image();
        let isDone = false;

        // Fallback for headless environments (jsdom) where Image decoding doesn't fire load/error events
        const timer = setTimeout(() => {
          if (!isDone) {
            isDone = true;
            resolve(fallbackResult);
          }
        }, 100);

        img.onload = () => {
          if (isDone) return;
          isDone = true;
          clearTimeout(timer);

          const naturalWidth = img.naturalWidth || img.width || 1920;
          const naturalHeight = img.naturalHeight || img.height || 1080;
          const exactRatio = naturalWidth / naturalHeight;
          const geometry = computeNormalizedGeometry(exactRatio);
          const bounds = getOrientationBounds(exactRatio, maxWidth, maxHeight);

          let width = naturalWidth;
          let height = naturalHeight;
          if (width > bounds.width || height > bounds.height) {
            const ratio = Math.min(bounds.width / width, bounds.height / height);
            width = Math.max(1, Math.round(width * ratio));
            height = Math.max(1, Math.round(height * ratio));
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({
              dataUrl: rawDataUrl,
              width: naturalWidth,
              height: naturalHeight,
              naturalWidth,
              naturalHeight,
              normalizedWidth: geometry.normalizedWidth,
              normalizedHeight: geometry.normalizedHeight,
              aspectRatio: geometry.aspectRatio,
              orientation: geometry.orientation,
              sourceType: 'image',
              wasCompressedHeavily: false
            });
            return;
          }

          try {
            ctx.drawImage(img, 0, 0, width, height);
            const { dataUrl, wasCompressedHeavily } = encodeNormalizedCanvas(
              canvas,
              ctx,
              width,
              height,
              {
                mimeType: file.type,
                allowAlphaPng: true,
                alreadyOpaqueWhite: false,
                exactRatio
              }
            );

            resolve({
              dataUrl,
              width: naturalWidth,
              height: naturalHeight,
              naturalWidth,
              naturalHeight,
              normalizedWidth: geometry.normalizedWidth,
              normalizedHeight: geometry.normalizedHeight,
              aspectRatio: geometry.aspectRatio,
              orientation: geometry.orientation,
              sourceType: 'image',
              wasCompressedHeavily
            });
          } catch (err) {
            reject(err instanceof Error ? err : new Error(extractErrorMessage(err)));
          } finally {
            releaseCanvas(canvas);
          }
        };

        img.onerror = () => {
          if (isDone) return;
          isDone = true;
          clearTimeout(timer);
          resolve(fallbackResult);
        };

        img.src = rawDataUrl;
      } catch {
        resolve(fallbackResult);
      }
    };
    reader.onerror = (err) => {
      reject(new Error(extractErrorMessage(err)));
    };
    reader.readAsDataURL(file);
  });
}
