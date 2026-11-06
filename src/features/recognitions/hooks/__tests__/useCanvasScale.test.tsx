import { render, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useCanvasScale, computeFontScale } from '../useCanvasScale';
import { CertificateTemplate } from '../../types';

describe('useCanvasScale hook', () => {
  const mockTemplate: CertificateTemplate = {
    background_url: '',
    page_width: 297,
    page_height: 210,
    aspect_ratio: 297 / 210,
    orientation: 'landscape',
    fields: []
  };

  it('calculates normalized dimensions and font scale', () => {
    let hookResult: ReturnType<typeof useCanvasScale> | undefined;

    const TestComponent = () => {
      hookResult = useCanvasScale(mockTemplate);
      return <div ref={hookResult.canvasRef} style={{ width: '842px' }} />;
    };

    render(<TestComponent />);

    expect(hookResult?.normalizedDimensions.width).toBe(297);
    expect(hookResult?.normalizedDimensions.height).toBe(210);
    expect(hookResult?.normalizedDimensions.orientation).toBe('landscape');
    expect(hookResult?.fontScale).toBeGreaterThan(0);
  });

  it('supports custom ResizeObserver callback to update pixel width', () => {
    let observerCallback: (entries: { contentRect: { width: number } }[]) => void = () => {};

    class MockResizeObserver {
      constructor(callback: (entries: { contentRect: { width: number } }[]) => void) {
        observerCallback = callback;
      }
      observe() {}
      disconnect() {}
    }

    const originalObserver = global.ResizeObserver;
    global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

    let hookResult: ReturnType<typeof useCanvasScale> | undefined;

    const TestComponent = () => {
      hookResult = useCanvasScale(mockTemplate);
      return <div ref={hookResult.canvasRef} />;
    };

    render(<TestComponent />);

    act(() => {
      observerCallback([{ contentRect: { width: 900 } }]);
    });

    expect(hookResult?.canvasPixelWidth).toBe(900);

    global.ResizeObserver = originalObserver;
  });

  it('returns finite fontScale = 1 when docWidthPt = 0 or non-positive instead of Infinity', () => {
    expect(computeFontScale(800, 0)).toBe(1);
    expect(computeFontScale(0, 0)).toBe(1);
    expect(computeFontScale(800, -100)).toBe(1);
    expect(computeFontScale(800, Number.NaN)).toBe(1);

    const zeroWidthTemplate: CertificateTemplate = {
      ...mockTemplate,
      page_width: 0,
      page_height: 0,
      aspect_ratio: 0
    };

    let hookResult: ReturnType<typeof useCanvasScale> | undefined;

    const TestComponent = () => {
      hookResult = useCanvasScale(zeroWidthTemplate);
      return <div ref={hookResult.canvasRef} />;
    };

    render(<TestComponent />);

    expect(Number.isFinite(hookResult?.fontScale)).toBe(true);
    expect(hookResult?.fontScale).toBe(1);
  });
});
