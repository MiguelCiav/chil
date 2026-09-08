import { describe, it, expect } from 'vitest';
import { calculateSnapGuidelines } from '../snapGuidelines';
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
});
