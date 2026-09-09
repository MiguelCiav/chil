import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useCanvasDrag } from '../useCanvasDrag';
import { RecognitionFieldConfig } from '../../types';

describe('useCanvasDrag hook', () => {
  const mockFields: RecognitionFieldConfig[] = [
    {
      id: 'field-1',
      field_key: 'full_name',
      label: 'Nombre',
      x: 50,
      y: 50,
      font_family: 'helvetica',
      font_size: 20,
      font_weight: 'bold',
      color: '#000000',
      align: 'center'
    }
  ];

  it('initializes pointer down and updates coordinates on pointer move within canvas boundary', () => {
    const onUpdateFieldCoordinates = vi.fn();
    const onSelectField = vi.fn();

    const mockCanvas = document.createElement('div');
    vi.spyOn(mockCanvas, 'getBoundingClientRect').mockReturnValue({
      width: 1000,
      height: 500,
      top: 0,
      left: 0,
      right: 1000,
      bottom: 500,
      x: 0,
      y: 0,
      toJSON: () => {}
    });

    const canvasRef = { current: mockCanvas };

    const { result } = renderHook(() =>
      useCanvasDrag({
        canvasRef,
        fields: mockFields,
        isPreviewMode: false,
        onUpdateFieldCoordinates,
        onSelectField
      })
    );

    const mockTarget = document.createElement('div');
    mockTarget.setPointerCapture = vi.fn();
    mockTarget.releasePointerCapture = vi.fn();

    // Start drag
    act(() => {
      result.current.handlePointerDown(
        {
          currentTarget: mockTarget,
          clientX: 100,
          clientY: 100,
          pointerId: 1,
          stopPropagation: vi.fn(),
          preventDefault: vi.fn()
        } as unknown as React.PointerEvent<HTMLDivElement>,
        'field-1'
      );
    });

    expect(onSelectField).toHaveBeenCalledWith('field-1');
    expect(mockTarget.setPointerCapture).toHaveBeenCalledWith(1);

    // Move drag: +50px X (5%), +25px Y (5%)
    act(() => {
      result.current.handlePointerMove({
        clientX: 150,
        clientY: 125
      } as unknown as React.PointerEvent<HTMLDivElement>);
    });

    expect(onUpdateFieldCoordinates).toHaveBeenCalledWith('field-1', 55, 55);

    // Release drag
    act(() => {
      result.current.handlePointerUp({
        currentTarget: mockTarget,
        pointerId: 1
      } as unknown as React.PointerEvent<HTMLDivElement>);
    });

    expect(mockTarget.releasePointerCapture).toHaveBeenCalledWith(1);
  });

  it('clamps coordinates to boundaries (2% to 98%)', () => {
    const onUpdateFieldCoordinates = vi.fn();

    const mockCanvas = document.createElement('div');
    vi.spyOn(mockCanvas, 'getBoundingClientRect').mockReturnValue({
      width: 1000,
      height: 500,
      top: 0,
      left: 0,
      right: 1000,
      bottom: 500,
      x: 0,
      y: 0,
      toJSON: () => {}
    });

    const canvasRef = { current: mockCanvas };

    const { result } = renderHook(() =>
      useCanvasDrag({
        canvasRef,
        fields: mockFields,
        isPreviewMode: false,
        onUpdateFieldCoordinates
      })
    );

    const mockTarget = document.createElement('div');

    act(() => {
      result.current.handlePointerDown(
        {
          currentTarget: mockTarget,
          clientX: 100,
          clientY: 100,
          pointerId: 1,
          stopPropagation: vi.fn(),
          preventDefault: vi.fn()
        } as unknown as React.PointerEvent<HTMLDivElement>,
        'field-1'
      );
    });

    // Move far left/top (should clamp to 2)
    act(() => {
      result.current.handlePointerMove({
        clientX: -1000,
        clientY: -1000
      } as unknown as React.PointerEvent<HTMLDivElement>);
    });

    expect(onUpdateFieldCoordinates).toHaveBeenCalledWith('field-1', 2, 2);

    // Move far right/bottom (should clamp to 98)
    act(() => {
      result.current.handlePointerMove({
        clientX: 2000,
        clientY: 2000
      } as unknown as React.PointerEvent<HTMLDivElement>);
    });

    expect(onUpdateFieldCoordinates).toHaveBeenCalledWith('field-1', 98, 98);
  });

  it('ignores drag events when in preview mode', () => {
    const onUpdateFieldCoordinates = vi.fn();
    const onSelectField = vi.fn();
    const canvasRef = { current: document.createElement('div') };

    const { result } = renderHook(() =>
      useCanvasDrag({
        canvasRef,
        fields: mockFields,
        isPreviewMode: true,
        onUpdateFieldCoordinates,
        onSelectField
      })
    );

    act(() => {
      result.current.handlePointerDown(
        {
          currentTarget: document.createElement('div'),
          clientX: 100,
          clientY: 100,
          pointerId: 1,
          stopPropagation: vi.fn(),
          preventDefault: vi.fn()
        } as unknown as React.PointerEvent<HTMLDivElement>,
        'field-1'
      );
    });

    expect(onSelectField).not.toHaveBeenCalled();
  });

  it('calculates activeGuides and snaps when dragging near center or other fields', () => {
    const onUpdateFieldCoordinates = vi.fn();
    const twoFields: RecognitionFieldConfig[] = [
      {
        id: 'field-1',
        field_key: 'full_name',
        label: 'Nombre',
        x: 40,
        y: 40,
        font_family: 'helvetica',
        font_size: 20,
        font_weight: 'bold',
        color: '#000000',
        align: 'center'
      },
      {
        id: 'field-2',
        field_key: 'identity',
        label: 'Cédula',
        x: 20,
        y: 80,
        font_family: 'helvetica',
        font_size: 14,
        font_weight: 'normal',
        color: '#000000',
        align: 'center'
      }
    ];

    const mockCanvas = document.createElement('div');
    vi.spyOn(mockCanvas, 'getBoundingClientRect').mockReturnValue({
      width: 1000,
      height: 500,
      top: 0,
      left: 0,
      right: 1000,
      bottom: 500,
      x: 0,
      y: 0,
      toJSON: () => {}
    });

    const canvasRef = { current: mockCanvas };

    const { result } = renderHook(() =>
      useCanvasDrag({
        canvasRef,
        fields: twoFields,
        isPreviewMode: false,
        onUpdateFieldCoordinates
      })
    );

    const mockTarget = document.createElement('div');
    mockTarget.setPointerCapture = vi.fn();
    mockTarget.releasePointerCapture = vi.fn();

    // Start dragging field-1 from initialX: 40, initialY: 40
    act(() => {
      result.current.handlePointerDown(
        {
          currentTarget: mockTarget,
          clientX: 100,
          clientY: 100,
          pointerId: 1,
          stopPropagation: vi.fn(),
          preventDefault: vi.fn()
        } as unknown as React.PointerEvent<HTMLDivElement>,
        'field-1'
      );
    });

    // Move +95px X (9.5% -> 49.5% X, within 1.5% of center 50%)
    // Move +50px Y (10% -> 50% Y, exactly center 50%)
    act(() => {
      result.current.handlePointerMove({
        clientX: 195,
        clientY: 150
      } as unknown as React.PointerEvent<HTMLDivElement>);
    });

    // Should snap both X and Y to 50%
    expect(onUpdateFieldCoordinates).toHaveBeenCalledWith('field-1', 50, 50);
    expect(result.current.activeGuides).toHaveLength(2);
    expect(result.current.activeGuides).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ orientation: 'vertical', position: 50, type: 'canvas-center' }),
        expect.objectContaining({ orientation: 'horizontal', position: 50, type: 'canvas-center' })
      ])
    );

    // Release pointer: guides should clear
    act(() => {
      result.current.handlePointerUp({
        currentTarget: mockTarget,
        pointerId: 1
      } as unknown as React.PointerEvent<HTMLDivElement>);
    });

    expect(result.current.activeGuides).toEqual([]);
  });
});
