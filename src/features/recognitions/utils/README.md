# Recognitions Utils

## Overview
Provides pure geometry and snapping utilities for computing optical field edges and alignment guidelines during canvas drag operations.

## Interface
- `index.ts:*`: Re-exports all symbols from `./snapGuidelines`.
- `snapGuidelines.ts:AlignmentGuide`: Interface describing a horizontal/vertical guide line at a percentage position (`'canvas-center' | 'field-align'`).
- `snapGuidelines.ts:SnapResult`: Interface `{ snappedX: number; snappedY: number; activeGuides: AlignmentGuide[] }`.
- `snapGuidelines.ts:CalculateSnapParams`: Interface for `calculateSnapGuidelines` input parameters (including optional `threshold`, `thresholdX`, `thresholdY`, and `fieldWidths`).
- `snapGuidelines.ts:FieldHorizontalEdges`: Interface `{ left: number; center: number; right: number }`.
- `snapGuidelines.ts:getFieldHorizontalEdges`: Function computing `left`, `center`, and `right` X percentages from anchor `x`, `align`, and `widthPercent`.
- `snapGuidelines.ts:calculateSnapGuidelines`: Function computing snapped `(x, y)` coordinates and active `AlignmentGuide[]` against canvas center and other fields.

## Invariants
- `snapGuidelines.ts:getFieldHorizontalEdges`: Defaults `align = 'center'` and `widthPercent = 0`; treats non-finite or `<= 0` `widthPercent` as `0` (returning `{ left: x, center: x, right: x }`). Otherwise offsets `left`/`center`/`right` based on `'left'`, `'right'`, or `'center'` alignment.
- `snapGuidelines.ts:calculateSnapGuidelines`: Defaults `threshold = 1.5` (%) and `thresholdX = threshold`, `thresholdY = threshold`, `draggedAlign = 'center'`. Checks canvas center `X = 50%` and `Y = 50%` first with `delta <= thresholdX` / `thresholdY`, then checks other fields with `delta <= thresholdX` / `thresholdY && delta < bestDelta` (strictly closer wins). When both `draggedWidth === 0` and `otherWidth === 0`, compares anchor `X`; otherwise compares all 3x3 combinations of `{ center, left, right }` horizontal edges. `Y` snapping compares `currentY` against `50` and `other.y`. Rounds optical-edge and canvas-center-X snap values/positions to 2 decimal places.

## Side Effects
- None.

## Verification
- Run: `npm test -- --run`
