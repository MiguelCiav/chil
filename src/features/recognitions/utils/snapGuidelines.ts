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
  fieldWidths?: Record<string, number>; // optional width in % per fieldId for optical edge snapping
}

export interface FieldHorizontalEdges {
  left: number;
  center: number;
  right: number;
}

/**
 * Computes the optical horizontal edges (left, center, right) in canvas percentage
 * given a field's anchor X, alignment, and optional width percentage.
 */
export function getFieldHorizontalEdges(
  x: number,
  align: RecognitionFieldConfig['align'] = 'center',
  widthPercent = 0
): FieldHorizontalEdges {
  const safeWidth = Number.isFinite(widthPercent) && widthPercent > 0 ? widthPercent : 0;
  if (safeWidth === 0) {
    return { left: x, center: x, right: x };
  }

  switch (align) {
    case 'left':
      return {
        left: x,
        center: x + safeWidth / 2,
        right: x + safeWidth
      };
    case 'right':
      return {
        left: x - safeWidth,
        center: x - safeWidth / 2,
        right: x
      };
    case 'center':
    default:
      return {
        left: x - safeWidth / 2,
        center: x,
        right: x + safeWidth / 2
      };
  }
}

/**
 * Calculates snapped coordinates and active alignment guides for a field being dragged.
 * Snaps to:
 * - Canvas horizontal center (X = 50%)
 * - Canvas vertical center (Y = 50%)
 * - Other fields' X positions (anchor or optical edges when fieldWidths provided)
 * - Other fields' Y positions (center alignment)
 */
export function calculateSnapGuidelines({
  currentX,
  currentY,
  fieldId,
  fields,
  threshold = 1.5,
  fieldWidths
}: CalculateSnapParams): SnapResult {
  let snappedX = currentX;
  let snappedY = currentY;
  const activeGuides: AlignmentGuide[] = [];

  const draggedField = fields.find((f) => f.id === fieldId);
  const draggedAlign = draggedField?.align ?? 'center';
  const draggedWidth = fieldWidths?.[fieldId] ?? 0;
  const draggedEdges = getFieldHorizontalEdges(currentX, draggedAlign, draggedWidth);

  // Check X alignment (vertical guide line)
  let bestDeltaX = threshold + 1;
  let chosenGuideX: AlignmentGuide | null = null;
  let chosenSnapX: number | null = null;

  // 1. Check Canvas Center X = 50%
  const deltaCanvasCenterX = Math.abs(draggedEdges.center - 50);
  if (deltaCanvasCenterX <= threshold) {
    bestDeltaX = deltaCanvasCenterX;
    chosenSnapX = Math.round((currentX + (50 - draggedEdges.center)) * 100) / 100;
    chosenGuideX = {
      orientation: 'vertical',
      position: 50,
      type: 'canvas-center'
    };
  }

  // 2. Check other fields for X alignment
  const otherFields = fields.filter((f) => f.id !== fieldId);
  for (const other of otherFields) {
    const otherWidth = fieldWidths?.[other.id] ?? 0;

    if (draggedWidth === 0 && otherWidth === 0) {
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
    } else {
      const otherEdges = getFieldHorizontalEdges(other.x, other.align, otherWidth);
      const draggedCandidates = [draggedEdges.center, draggedEdges.left, draggedEdges.right];
      const targetCandidates = [otherEdges.center, otherEdges.left, otherEdges.right];

      for (const dEdge of draggedCandidates) {
        for (const tEdge of targetCandidates) {
          const delta = Math.abs(dEdge - tEdge);
          if (delta <= threshold && delta < bestDeltaX) {
            bestDeltaX = delta;
            chosenSnapX = Math.round((currentX + (tEdge - dEdge)) * 100) / 100;
            chosenGuideX = {
              orientation: 'vertical',
              position: Math.round(tEdge * 100) / 100,
              type: 'field-align',
              targetFieldId: other.id
            };
          }
        }
      }
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
