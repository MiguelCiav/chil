# Batches Types

## Overview
TypeScript type definitions for the batches feature. Re-exports shared application types from `../../../types` and defines batch-specific filter chip types.

## Interface
- `index.ts:ActiveFilterChip` - Interface representing an active filter chip (`id`, `label`, `value`, optional canonical `filterValue`, `type`: `'date' | 'region' | 'district' | 'group' | 'unit' | 'recognition' | 'completeness'`).
- `index.ts:*` - Re-exports all symbols from `../../../types`.

## Invariants
- `ActiveFilterChip.type` must be one of `'date' | 'region' | 'district' | 'group' | 'unit' | 'recognition' | 'completeness'` (`index.ts:ActiveFilterChip`).

## Side Effects
- None (pure TypeScript type declarations and re-exports).

## Verification
- Run: `npm test`
