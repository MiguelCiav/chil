# Landing Types

## Overview
Defines TypeScript interfaces for the landing page's showcase visuals, storytelling chapters, manifesto lines, and product facts.

## Interface
- `index.ts:ShowcaseVisualProps`: Interface `{ active: boolean }`.
- `index.ts:LandingChapter`: Interface `{ id: string; number: string; verb: string; title: string; body: string; Visual: FC<ShowcaseVisualProps> }`.
- `index.ts:ManifestoLine`: Interface `{ text: string; accent: boolean }`.
- `index.ts:ProductFactItem`: Interface `{ figure: string; title: string; body: string }`.

## Invariants
- None.

## Side Effects
- None.

## Verification
- Run: `npm test -- --run`
