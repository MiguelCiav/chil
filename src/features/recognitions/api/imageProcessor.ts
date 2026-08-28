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

export async function processBackgroundImageFile(
  file: File,
  maxWidth = 1920,
  maxHeight = 1440
): Promise<ProcessedBackgroundResult> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve({
          dataUrl,
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
      reader.onerror = (err) => reject(new Error(String(err instanceof Error ? err.message : err)));
      reader.readAsDataURL(file);
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
          const orientation: 'landscape' | 'portrait' = naturalWidth >= naturalHeight ? 'landscape' : 'portrait';

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

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
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
          try {
            const webpData = canvas.toDataURL('image/webp', 0.88);
            if (webpData?.startsWith('data:image/webp')) {
              resolve({
                dataUrl: webpData,
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
          } catch {
            // Fallback if webp unsupported
          }
          resolve({
            dataUrl: canvas.toDataURL('image/jpeg', 0.88),
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
    reader.onerror = (err) => reject(new Error(String(err instanceof Error ? err.message : err)));
    reader.readAsDataURL(file);
  });
}
