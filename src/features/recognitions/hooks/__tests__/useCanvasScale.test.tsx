import { render, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useCanvasScale } from '../useCanvasScale';
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
});
