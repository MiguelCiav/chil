import { useState, useEffect, useRef } from 'react';
import { CertificateTemplate } from '../types';
import { getNormalizedPageDimensions } from '../services/certificatePdfGenerator';

export function computeFontScale(canvasPixelWidth: number, docWidthPt: number): number {
  if (!Number.isFinite(docWidthPt) || docWidthPt <= 0) {
    return 1;
  }
  const effectivePixelWidth =
    Number.isFinite(canvasPixelWidth) && canvasPixelWidth > 0 ? canvasPixelWidth : 800;
  const scale = effectivePixelWidth / docWidthPt;
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

export function useCanvasScale(template: CertificateTemplate) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [canvasPixelWidth, setCanvasPixelWidth] = useState<number>(0);

  // Monitor DOM canvas pixel width for 1:1 WYSIWYG proportional font scaling
  useEffect(() => {
    if (!canvasRef.current) return;
    const updateWidth = () => {
      if (canvasRef.current) {
        const clientWidth = canvasRef.current.clientWidth;
        if (clientWidth > 0) {
          setCanvasPixelWidth(clientWidth);
        }
      }
    };

    updateWidth();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0) {
            setCanvasPixelWidth(entry.contentRect.width);
          }
        }
      });
      observer.observe(canvasRef.current);
      return () => observer.disconnect();
    } else {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
  }, [template.aspect_ratio, template.page_width, template.page_height]);

  const normalizedDimensions = getNormalizedPageDimensions(template);
  const hasInvalidPageWidth =
    typeof template.page_width === 'number' &&
    (!Number.isFinite(template.page_width) || template.page_width <= 0);
  const docWidthMm = hasInvalidPageWidth ? 0 : normalizedDimensions.width;
  const docWidthPt = docWidthMm * (72 / 25.4);
  const fontScale = computeFontScale(canvasPixelWidth, docWidthPt);

  return {
    canvasRef,
    canvasPixelWidth,
    fontScale,
    normalizedDimensions
  };
}
