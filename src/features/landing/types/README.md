# Landing Types

## Overview
Defines TypeScript interfaces for the landing page's feature cards, workflow steps, and Scout value items.

## Interface
- `index.ts:FeatureCardItem`: Interface `{ id: string; icon: ReactNode; title: string; badge?: string; description: string; highlights: string[] }`.
- `index.ts:WorkflowStepItem`: Interface `{ stepNumber: number; title: string; description: string; icon: ReactNode; tagline: string }`.
- `index.ts:ScoutValueItem`: Interface `{ title: string; description: string; badge: string; icon: ReactNode }`.

## Invariants
- None.

## Side Effects
- None.

## Verification
- Run: `npm test -- --run`
