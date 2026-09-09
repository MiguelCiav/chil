import { RecognitionFieldConfig } from '../types';

export interface AlignmentGuide {
  orientation: 'horizontal' | 'vertical';
  position: number; // percentage (0-100)
  type: 'canvas-center' | 'field-align';
  targetFieldId?: string;
}

export interface SnapResult {
  snappedX: number;
  snappedY: number;
  activeGuides: AlignmentGuide[];
}

export interface CalculateSnapParams {
  currentX: number;
  currentY: number;
  fieldId: string;
  fields: RecognitionFieldConfig[];
  threshold?: number; // default: 1.5%
}

/**
 * Calculates snapped coordinates and active alignment guides for a field being dragged.
 * Snaps to:
 * - Canvas horizontal center (X = 50%)
 * - Canvas vertical center (Y = 50%)
 * - Other fields' X positions (center alignment)
 * - Other fields' Y positions (center alignment)
 */
export function calculateSnapGuidelines({
  currentX,
  currentY,
  fieldId,
  fields,
  threshold = 1.5
}: CalculateSnapParams): SnapResult {
  let snappedX = currentX;
  let snappedY = currentY;
  const activeGuides: AlignmentGuide[] = [];

  // Check X alignment (vertical guide line)
  let bestDeltaX = threshold + 1;
  let chosenGuideX: AlignmentGuide | null = null;
  let chosenSnapX: number | null = null;

  // 1. Check Canvas Center X = 50%
  const deltaCanvasCenterX = Math.abs(currentX - 50);
  if (deltaCanvasCenterX <= threshold) {
    bestDeltaX = deltaCanvasCenterX;
    chosenSnapX = 50;
    chosenGuideX = {
      orientation: 'vertical',
      position: 50,
      type: 'canvas-center'
    };
  }

  // 2. Check other fields for X alignment
  const otherFields = fields.filter((f) => f.id !== fieldId);
  for (const other of otherFields) {
    const delta = Math.abs(currentX - other.x);
    if (delta <= threshold && delta < bestDeltaX) {
      bestDeltaX = delta;
      chosenSnapX = other.x;
      chosenGuideX = {
        orientation: 'vertical',
        position: other.x,
        type: 'field-align',
        targetFieldId: other.id
      };
    }
  }

  if (chosenGuideX && chosenSnapX !== null) {
    snappedX = chosenSnapX;
    activeGuides.push(chosenGuideX);
  }

  // Check Y alignment (horizontal guide line)
  let bestDeltaY = threshold + 1;
  let chosenGuideY: AlignmentGuide | null = null;
  let chosenSnapY: number | null = null;

  // 1. Check Canvas Center Y = 50%
  const deltaCanvasCenterY = Math.abs(currentY - 50);
  if (deltaCanvasCenterY <= threshold) {
    bestDeltaY = deltaCanvasCenterY;
    chosenSnapY = 50;
    chosenGuideY = {
      orientation: 'horizontal',
      position: 50,
      type: 'canvas-center'
    };
  }

  // 2. Check other fields for Y alignment
  for (const other of otherFields) {
    const delta = Math.abs(currentY - other.y);
    if (delta <= threshold && delta < bestDeltaY) {
      bestDeltaY = delta;
      chosenSnapY = other.y;
      chosenGuideY = {
        orientation: 'horizontal',
        position: other.y,
        type: 'field-align',
        targetFieldId: other.id
      };
    }
  }

  if (chosenGuideY && chosenSnapY !== null) {
    snappedY = chosenSnapY;
    activeGuides.push(chosenGuideY);
  }

  return {
    snappedX,
    snappedY,
    activeGuides
  };
}
