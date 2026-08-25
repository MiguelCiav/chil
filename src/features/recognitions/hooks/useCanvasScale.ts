import { useState, useEffect, useRef } from 'react';
import { CertificateTemplate } from '../types';
import { getNormalizedPageDimensions } from '../services/certificatePdfGenerator';

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
  const docWidthMm = normalizedDimensions.width;
  const docWidthPt = docWidthMm * (72 / 25.4);
  const fontScale =
    canvasPixelWidth > 0 && docWidthPt > 0 ? canvasPixelWidth / docWidthPt : 800 / docWidthPt || 1;

  return {
    canvasRef,
    canvasPixelWidth,
    fontScale,
    normalizedDimensions
  };
}
