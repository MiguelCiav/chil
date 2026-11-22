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
  thresholdX?: number; // optional horizontal override in percentage
  thresholdY?: number; // optional vertical override in percentage
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

interface AxisSnapMatch {
  snappedCoord: number;
  guide: AlignmentGuide | null;
}

function matchOpticalFieldX(
  currentX: number,
  draggedEdges: FieldHorizontalEdges,
  other: RecognitionFieldConfig,
  otherWidth: number,
  thresholdX: number,
  bestDeltaX: number
): { delta: number; snapX: number; guide: AlignmentGuide } | null {
  const otherEdges = getFieldHorizontalEdges(other.x, other.align, otherWidth);
  const draggedCandidates = [draggedEdges.center, draggedEdges.left, draggedEdges.right];
  const targetCandidates = [otherEdges.center, otherEdges.left, otherEdges.right];

  let match: { delta: number; snapX: number; guide: AlignmentGuide } | null = null;
  let currentBest = bestDeltaX;

  for (const dEdge of draggedCandidates) {
    for (const tEdge of targetCandidates) {
      const delta = Math.abs(dEdge - tEdge);
      if (delta <= thresholdX && delta < currentBest) {
        currentBest = delta;
        match = {
          delta,
          snapX: Math.round((currentX + (tEdge - dEdge)) * 100) / 100,
          guide: {
            orientation: 'vertical',
            position: Math.round(tEdge * 100) / 100,
            type: 'field-align',
            targetFieldId: other.id
          }
        };
      }
    }
  }
  return match;
}

function findHorizontalSnap(
  currentX: number,
  draggedWidth: number,
  draggedEdges: FieldHorizontalEdges,
  otherFields: readonly RecognitionFieldConfig[],
  thresholdX: number,
  fieldWidths?: Record<string, number>
): AxisSnapMatch {
  let bestDeltaX = thresholdX + 1;
  let chosenGuideX: AlignmentGuide | null = null;
  let chosenSnapX = currentX;

  const deltaCanvasCenterX = Math.abs(draggedEdges.center - 50);
  if (deltaCanvasCenterX <= thresholdX) {
    bestDeltaX = deltaCanvasCenterX;
    chosenSnapX = Math.round((currentX + (50 - draggedEdges.center)) * 100) / 100;
    chosenGuideX = {
      orientation: 'vertical',
      position: 50,
      type: 'canvas-center'
    };
  }

  for (const other of otherFields) {
    const otherWidth = fieldWidths?.[other.id] ?? 0;

    if (draggedWidth === 0 && otherWidth === 0) {
      const delta = Math.abs(currentX - other.x);
      if (delta <= thresholdX && delta < bestDeltaX) {
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
      const opticalMatch = matchOpticalFieldX(
        currentX,
        draggedEdges,
        other,
        otherWidth,
        thresholdX,
        bestDeltaX
      );
      if (opticalMatch) {
        bestDeltaX = opticalMatch.delta;
        chosenSnapX = opticalMatch.snapX;
        chosenGuideX = opticalMatch.guide;
      }
    }
  }

  return { snappedCoord: chosenSnapX, guide: chosenGuideX };
}

function findVerticalSnap(
  currentY: number,
  otherFields: readonly RecognitionFieldConfig[],
  thresholdY: number
): AxisSnapMatch {
  let bestDeltaY = thresholdY + 1;
  let chosenGuideY: AlignmentGuide | null = null;
  let chosenSnapY = currentY;

  const deltaCanvasCenterY = Math.abs(currentY - 50);
  if (deltaCanvasCenterY <= thresholdY) {
    bestDeltaY = deltaCanvasCenterY;
    chosenSnapY = 50;
    chosenGuideY = {
      orientation: 'horizontal',
      position: 50,
      type: 'canvas-center'
    };
  }

  for (const other of otherFields) {
    const delta = Math.abs(currentY - other.y);
    if (delta <= thresholdY && delta < bestDeltaY) {
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

  return { snappedCoord: chosenSnapY, guide: chosenGuideY };
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
  thresholdX = threshold,
  thresholdY = threshold,
  fieldWidths
}: CalculateSnapParams): SnapResult {
  const activeGuides: AlignmentGuide[] = [];
  const draggedField = fields.find((f) => f.id === fieldId);
  const draggedAlign = draggedField?.align ?? 'center';
  const draggedWidth = fieldWidths?.[fieldId] ?? 0;
  const draggedEdges = getFieldHorizontalEdges(currentX, draggedAlign, draggedWidth);
  const otherFields = fields.filter((f) => f.id !== fieldId);

  const xSnap = findHorizontalSnap(
    currentX,
    draggedWidth,
    draggedEdges,
    otherFields,
    thresholdX,
    fieldWidths
  );
  if (xSnap.guide) {
    activeGuides.push(xSnap.guide);
  }

  const ySnap = findVerticalSnap(currentY, otherFields, thresholdY);
  if (ySnap.guide) {
    activeGuides.push(ySnap.guide);
  }

  return {
    snappedX: xSnap.snappedCoord,
    snappedY: ySnap.snappedCoord,
    activeGuides
  };
}
