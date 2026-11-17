import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useCanvasDrag, clampFieldCoordinates } from '../useCanvasDrag';
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

  it('releases pointer capture on the captured field element even when pointerup occurs on canvas container', () => {
    const onUpdateFieldCoordinates = vi.fn();
    const mockCanvas = document.createElement('div');
    mockCanvas.releasePointerCapture = vi.fn();
    const canvasRef = { current: mockCanvas };

    const { result } = renderHook(() =>
      useCanvasDrag({
        canvasRef,
        fields: mockFields,
        isPreviewMode: false,
        onUpdateFieldCoordinates
      })
    );

    const mockFieldTarget = document.createElement('div');
    mockFieldTarget.setPointerCapture = vi.fn();
    mockFieldTarget.releasePointerCapture = vi.fn();

    act(() => {
      result.current.handlePointerDown(
        {
          currentTarget: mockFieldTarget,
          clientX: 100,
          clientY: 100,
          pointerId: 7,
          stopPropagation: vi.fn(),
          preventDefault: vi.fn()
        } as unknown as React.PointerEvent<HTMLDivElement>,
        'field-1'
      );
    });

    expect(mockFieldTarget.setPointerCapture).toHaveBeenCalledWith(7);

    // Pointer up fires on the canvas container instead of the field button
    act(() => {
      result.current.handlePointerUp({
        currentTarget: mockCanvas,
        pointerId: 7
      } as unknown as React.PointerEvent<HTMLDivElement>);
    });

    expect(mockFieldTarget.releasePointerCapture).toHaveBeenCalledWith(7);
  });

  it('supports alignment-aware coordinate clamping for center, left, and right aligned fields', () => {
    // 20% width field:
    // center-aligned -> [12, 88]
    expect(
      clampFieldCoordinates(95, 50, { align: 'center', fieldWidthPercent: 20 })
    ).toEqual({ x: 88, y: 50 });
    expect(
      clampFieldCoordinates(5, 50, { align: 'center', fieldWidthPercent: 20 })
    ).toEqual({ x: 12, y: 50 });

    // left-aligned -> [2, 78]
    expect(
      clampFieldCoordinates(95, 50, { align: 'left', fieldWidthPercent: 20 })
    ).toEqual({ x: 78, y: 50 });
    expect(
      clampFieldCoordinates(0, 50, { align: 'left', fieldWidthPercent: 20 })
    ).toEqual({ x: 2, y: 50 });

    // right-aligned -> [22, 98]
    expect(
      clampFieldCoordinates(5, 50, { align: 'right', fieldWidthPercent: 20 })
    ).toEqual({ x: 22, y: 50 });
    expect(
      clampFieldCoordinates(99, 50, { align: 'right', fieldWidthPercent: 20 })
    ).toEqual({ x: 98, y: 50 });
  });

  it('keeps oversized fields movable across [2, 98] instead of freezing at 50%', () => {
    expect(
      clampFieldCoordinates(20, 30, { align: 'center', fieldWidthPercent: 98, fieldHeightPercent: 98 })
    ).toEqual({ x: 20, y: 30 });
    expect(
      clampFieldCoordinates(90, 90, { align: 'center', fieldWidthPercent: 110 })
    ).toEqual({ x: 90, y: 90 });
  });

  it('ignores sub-threshold micro-jitter (< 3px), bypasses snap with Alt or snapEnabled=false, and commits 1 undo step on pointerup', () => {
    const onUpdateFieldCoordinates = vi.fn();
    const onCommitFieldCoordinates = vi.fn();
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

    const { result, rerender } = renderHook(
      ({ snapEnabled }: { snapEnabled: boolean }) =>
        useCanvasDrag({
          canvasRef: { current: mockCanvas },
          fields: [
            {
              ...mockFields[0],
              x: 40,
              y: 40
            }
          ],
          isPreviewMode: false,
          snapEnabled,
          onUpdateFieldCoordinates,
          onCommitFieldCoordinates
        }),
      { initialProps: { snapEnabled: true } }
    );

    const mockTarget = document.createElement('div');

    // Click with 2px micro-jitter: should not move or commit
    act(() => {
      result.current.handlePointerDown(
        {
          currentTarget: mockTarget,
          clientX: 100,
          clientY: 100,
          pointerId: 1,
          button: 0,
          stopPropagation: vi.fn(),
          preventDefault: vi.fn()
        } as unknown as React.PointerEvent<HTMLDivElement>,
        'field-1'
      );
    });
    act(() => {
      result.current.handlePointerMove({
        clientX: 102,
        clientY: 101,
        altKey: false
      } as unknown as React.PointerEvent<HTMLDivElement>);
    });
    expect(onUpdateFieldCoordinates).not.toHaveBeenCalled();

    // Move +108px X (50.8% -> 8px away from 50%, outside adaptive 6px / 0.6% snap radius!)
    act(() => {
      result.current.handlePointerMove({
        clientX: 208,
        clientY: 100,
        altKey: false
      } as unknown as React.PointerEvent<HTMLDivElement>);
    });
    expect(onUpdateFieldCoordinates).toHaveBeenLastCalledWith('field-1', 50.8, 40);
    expect(result.current.activeGuides).toEqual([]);

    // Move +95px X (49.5% -> 5px away from 50%, snaps to 50%)
    act(() => {
      result.current.handlePointerMove({
        clientX: 195,
        clientY: 100,
        altKey: false
      } as unknown as React.PointerEvent<HTMLDivElement>);
    });
    expect(onUpdateFieldCoordinates).toHaveBeenLastCalledWith('field-1', 50, 40);
    expect(result.current.activeGuides).toHaveLength(1);

    // Hold Alt: bypasses snapping at exact same pointer spot -> 49.5%
    act(() => {
      result.current.handlePointerMove({
        clientX: 195,
        clientY: 100,
        altKey: true
      } as unknown as React.PointerEvent<HTMLDivElement>);
    });
    expect(onUpdateFieldCoordinates).toHaveBeenLastCalledWith('field-1', 49.5, 40);
    expect(result.current.activeGuides).toEqual([]);

    // Release pointer: commits one single move from (40, 40) to (49.5, 40)
    act(() => {
      result.current.handlePointerUp({
        currentTarget: mockTarget,
        pointerId: 1
      } as unknown as React.PointerEvent<HTMLDivElement>);
    });
    expect(onCommitFieldCoordinates).toHaveBeenCalledTimes(1);
    expect(onCommitFieldCoordinates).toHaveBeenCalledWith('field-1', 40, 40, 49.5, 40);

    // Rerender with snapEnabled=false: 49.5% should NOT snap even without Alt
    rerender({ snapEnabled: false });
    act(() => {
      result.current.handlePointerDown(
        {
          currentTarget: mockTarget,
          clientX: 100,
          clientY: 100,
          pointerId: 2,
          button: 0,
          stopPropagation: vi.fn(),
          preventDefault: vi.fn()
        } as unknown as React.PointerEvent<HTMLDivElement>,
        'field-1'
      );
    });
    act(() => {
      result.current.handlePointerMove({
        clientX: 195,
        clientY: 100,
        altKey: false
      } as unknown as React.PointerEvent<HTMLDivElement>);
    });
    expect(onUpdateFieldCoordinates).toHaveBeenLastCalledWith('field-1', 49.5, 40);
    expect(result.current.activeGuides).toEqual([]);
  });
});
