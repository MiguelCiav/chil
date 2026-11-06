import { describe, it, expect } from 'vitest';
import { calculateSnapGuidelines, getFieldHorizontalEdges } from '../snapGuidelines';
import { RecognitionFieldConfig } from '../../types';

describe('calculateSnapGuidelines utility', () => {
  const mockFields: RecognitionFieldConfig[] = [
    {
      id: 'field-1',
      field_key: 'full_name',
      label: 'Nombre',
      x: 50,
      y: 30,
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
      x: 25,
      y: 70,
      font_family: 'helvetica',
      font_size: 14,
      font_weight: 'normal',
      color: '#000000',
      align: 'center'
    }
  ];

  it('snaps to canvas center X = 50% when within threshold', () => {
    const result = calculateSnapGuidelines({
      currentX: 50.8,
      currentY: 10,
      fieldId: 'field-2',
      fields: mockFields,
      threshold: 1.5
    });

    expect(result.snappedX).toBe(50);
    expect(result.snappedY).toBe(10);
    expect(result.activeGuides).toEqual([
      {
        orientation: 'vertical',
        position: 50,
        type: 'canvas-center'
      }
    ]);
  });

  it('snaps to canvas center Y = 50% when within threshold', () => {
    const result = calculateSnapGuidelines({
      currentX: 10,
      currentY: 49.2,
      fieldId: 'field-1',
      fields: mockFields,
      threshold: 1.5
    });

    expect(result.snappedX).toBe(10);
    expect(result.snappedY).toBe(50);
    expect(result.activeGuides).toEqual([
      {
        orientation: 'horizontal',
        position: 50,
        type: 'canvas-center'
      }
    ]);
  });

  it('snaps to other field coordinates when close to them', () => {
    // field-2 has x: 25, y: 70
    // dragging field-1 to x: 25.5, y: 69.2
    const result = calculateSnapGuidelines({
      currentX: 25.5,
      currentY: 69.2,
      fieldId: 'field-1',
      fields: mockFields,
      threshold: 1.5
    });

    expect(result.snappedX).toBe(25);
    expect(result.snappedY).toBe(70);
    expect(result.activeGuides).toEqual([
      {
        orientation: 'vertical',
        position: 25,
        type: 'field-align',
        targetFieldId: 'field-2'
      },
      {
        orientation: 'horizontal',
        position: 70,
        type: 'field-align',
        targetFieldId: 'field-2'
      }
    ]);
  });

  it('does not snap when distance exceeds threshold', () => {
    const result = calculateSnapGuidelines({
      currentX: 12,
      currentY: 15,
      fieldId: 'field-1',
      fields: mockFields,
      threshold: 1.5
    });

    expect(result.snappedX).toBe(12);
    expect(result.snappedY).toBe(15);
    expect(result.activeGuides).toEqual([]);
  });

  it('computes optical horizontal edges based on alignment and fieldWidths', () => {
    expect(getFieldHorizontalEdges(20, 'left', 10)).toEqual({ left: 20, center: 25, right: 30 });
    expect(getFieldHorizontalEdges(50, 'center', 10)).toEqual({ left: 45, center: 50, right: 55 });
    expect(getFieldHorizontalEdges(80, 'right', 10)).toEqual({ left: 70, center: 75, right: 80 });

    const fieldsWithAlign: RecognitionFieldConfig[] = [
      {
        ...mockFields[0],
        id: 'field-left',
        x: 20,
        y: 30,
        align: 'left'
      },
      {
        ...mockFields[1],
        id: 'field-center',
        x: 50,
        y: 70,
        align: 'center'
      }
    ];

    // Dragging field-left (width 10%, left=14.6, center=19.6, right=24.6) near field-center's left edge (50 - 10 = 40)
    // Or dragging field-left to x=44.6 so its center (49.6) is within 1.5% of 50% canvas center
    const snapResult = calculateSnapGuidelines({
      currentX: 44.6,
      currentY: 30,
      fieldId: 'field-left',
      fields: fieldsWithAlign,
      threshold: 1.5,
      fieldWidths: { 'field-left': 10, 'field-center': 20 }
    });

    expect(snapResult.snappedX).toBe(45);
    expect(snapResult.activeGuides).toContainEqual({
      orientation: 'vertical',
      position: 50,
      type: 'canvas-center'
    });
  });
});
