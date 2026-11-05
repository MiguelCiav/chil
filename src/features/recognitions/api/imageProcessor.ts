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
}

export const PDF_UPLOAD_NOT_SUPPORTED_MESSAGE =
  'Formato PDF no soportado directamente como imagen de fondo. Por favor suba una imagen PNG, JPG o WebP.';

export const INVALID_IMAGE_FORMAT_MESSAGE =
  'Formato de archivo no soportado. Por favor suba una imagen PNG, JPG o WebP.';

/**
 * Maximum safe Base64 character length (~750 KB) to guarantee the serialized
 * template stays well below Cloud Firestore's 1 MB (1,048,576 bytes) document limit.
 */
export const MAX_FIRESTORE_BACKGROUND_BASE64_LENGTH = 750_000;

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  return 'Error al procesar la imagen';
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

/**
 * Encodes canvas into a jsPDF-compatible JPEG or PNG data URL while capping
 * the output size below Firestore's 1 MB document limit.
 */
function encodeNormalizedCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
  mimeType: string
): string {
  const mightHaveAlpha = mimeType === 'image/png' || mimeType === 'image/webp';
  if (mightHaveAlpha && hasAlphaTransparency(ctx, width, height)) {
    try {
      const pngDataUrl = canvas.toDataURL('image/png');
      if (
        pngDataUrl?.startsWith('data:image/png') &&
        pngDataUrl.length <= MAX_FIRESTORE_BACKGROUND_BASE64_LENGTH
      ) {
        return pngDataUrl;
      }
    } catch {
      // Fallback to JPEG encoding below
    }
  }

  // Composite onto an opaque white surface before JPEG encoding so transparent regions don't turn black
  if (typeof ctx.fillRect === 'function') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
  }

  const qualitySteps = [0.82, 0.72, 0.6, 0.5];
  let encoded = '';

  for (const quality of qualitySteps) {
    try {
      encoded = canvas.toDataURL('image/jpeg', quality);
      if (encoded.length <= MAX_FIRESTORE_BACKGROUND_BASE64_LENGTH) {
        return encoded;
      }
    } catch {
      // Continue to fallback
    }
  }

  return encoded || canvas.toDataURL('image/jpeg', 0.5);
}

export async function processBackgroundImageFile(
  file: File,
  maxWidth = 1920,
  maxHeight = 1080
): Promise<ProcessedBackgroundResult> {
  return new Promise((resolve, reject) => {
    const lowerName = file.name?.toLowerCase() ?? '';
    if (file.type === 'application/pdf' || lowerName.endsWith('.pdf')) {
      reject(new Error(PDF_UPLOAD_NOT_SUPPORTED_MESSAGE));
      return;
    }

    if (!file.type || !file.type.startsWith('image/')) {
      reject(new Error(INVALID_IMAGE_FORMAT_MESSAGE));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      if (typeof Image === 'undefined' || typeof document === 'undefined') {
        resolve({
          dataUrl: rawDataUrl,
          width: 297,
          height: 210,
          naturalWidth: 297,
          naturalHeight: 210,
          normalizedWidth: 297,
          normalizedHeight: 210,
          aspectRatio: Math.round((297 / 210) * 1000) / 1000,
          orientation: 'landscape'
        });
        return;
      }

      try {
        const img = new Image();
        let isDone = false;

        // Fallback for headless environments (jsdom) where Image decoding doesn't fire load/error events
        const timer = setTimeout(() => {
          if (!isDone) {
            isDone = true;
            resolve({
              dataUrl: rawDataUrl,
              width: 297,
              height: 210,
              naturalWidth: 297,
              naturalHeight: 210,
              normalizedWidth: 297,
              normalizedHeight: 210,
              aspectRatio: Math.round((297 / 210) * 1000) / 1000,
              orientation: 'landscape'
            });
          }
        }, 100);

        img.onload = () => {
          if (isDone) return;
          isDone = true;
          clearTimeout(timer);

          const naturalWidth = img.naturalWidth || img.width || 1920;
          const naturalHeight = img.naturalHeight || img.height || 1080;
          const aspectRatio = Math.round((naturalWidth / naturalHeight) * 1000) / 1000;
          const orientation: 'landscape' | 'portrait' =
            naturalWidth >= naturalHeight ? 'landscape' : 'portrait';

          let normalizedWidth: number;
          let normalizedHeight: number;
          if (orientation === 'landscape') {
            normalizedWidth = 297;
            normalizedHeight = Math.round((297 / (naturalWidth / naturalHeight)) * 100) / 100;
          } else {
            normalizedHeight = 297;
            normalizedWidth = Math.round((297 * (naturalWidth / naturalHeight)) * 100) / 100;
          }

          let width = naturalWidth;
          let height = naturalHeight;

          const boundWidth = orientation === 'portrait' ? Math.min(maxWidth, maxHeight) : maxWidth;
          const boundHeight = orientation === 'portrait' ? Math.max(maxWidth, maxHeight) : maxHeight;

          if (width > boundWidth || height > boundHeight) {
            const ratio = Math.min(boundWidth / width, boundHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
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
              normalizedWidth,
              normalizedHeight,
              aspectRatio,
              orientation
            });
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const encodedDataUrl = encodeNormalizedCanvas(
            canvas,
            ctx,
            img,
            width,
            height,
            file.type
          );

          resolve({
            dataUrl: encodedDataUrl,
            width: naturalWidth,
            height: naturalHeight,
            naturalWidth,
            naturalHeight,
            normalizedWidth,
            normalizedHeight,
            aspectRatio,
            orientation
          });
        };

        img.onerror = () => {
          if (isDone) return;
          isDone = true;
          clearTimeout(timer);
          resolve({
            dataUrl: rawDataUrl,
            width: 297,
            height: 210,
            naturalWidth: 297,
            naturalHeight: 210,
            normalizedWidth: 297,
            normalizedHeight: 210,
            aspectRatio: Math.round((297 / 210) * 1000) / 1000,
            orientation: 'landscape'
          });
        };

        img.src = rawDataUrl;
      } catch {
        resolve({
          dataUrl: rawDataUrl,
          width: 297,
          height: 210,
          naturalWidth: 297,
          naturalHeight: 210,
          normalizedWidth: 297,
          normalizedHeight: 210,
          aspectRatio: Math.round((297 / 210) * 1000) / 1000,
          orientation: 'landscape'
        });
      }
    };
    reader.onerror = (err) => {
      reject(new Error(extractErrorMessage(err)));
    };
    reader.readAsDataURL(file);
  });
}
