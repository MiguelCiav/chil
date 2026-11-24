# Shared Domain Components (`src/domain/components/`)

## Overview

Cross-feature Scout-domain UI widgets and app-shell navigation components shared across Chil's authenticated views, kept strictly outside `src/components/` so UI primitives remain domain-agnostic.

## Interface

- `index.ts: *` (re-exports `./MemberStatusBadge`, `./HierarchyFilterSelects`, `./MemberHierarchySelects`, `./FilterCard`, `./filterBadges`, and `./navigation`)
- `MemberStatusBadge.tsx:MemberStatusBadge`, `MemberStatusBadge.tsx:MemberStatusBadgeProps`
- `HierarchyFilterSelects.tsx:HierarchyFilterSelects`, `HierarchyFilterSelects.tsx:HierarchyFilterSelectsProps`
- `MemberHierarchySelects.tsx:MemberHierarchySelects`, `MemberHierarchySelects.tsx:MemberHierarchySelectsProps`
- `FilterCard.tsx:FilterCard`, `FilterCard.tsx:FilterCardProps`
- `filterBadges.ts:ActiveFilterBadge`, `filterBadges.ts:BuildCommonFilterBadgesParams`, `filterBadges.ts:buildCommonFilterBadges`
- `navigation/index.ts: *` (re-exports `./Sidebar` and `./ScraperSettingsModal`)

## Dependency Rules & Invariants

- **Root Domain Widgets (`MemberStatusBadge`, `HierarchyFilterSelects`, `MemberHierarchySelects`, `FilterCard`, `filterBadges`)**: May import strictly from `../../components`, `../../types/*`, and `../../utils/*` (`memberHierarchy.ts`, `datePeriod.ts`). Must never import from `src/features/*` or `src/context/*`.
- **App-Shell Navigation ([`./navigation/README.md`](./navigation/README.md))**: `Sidebar` and `ScraperSettingsModal` form the single documented app-shell navigation boundary consuming `src/features/auth`, `src/features/batches/api`, and `src/context/ScraperSettingsContext`.
- **Filter & Hierarchy Contracts**: `FilterCard` provides the titleless compact search bar, `"Filtros"` toggle with active badge count, removable summary chips (`ActiveFilterBadge`), shared date-period select (`DATE_PERIOD_OPTIONS`), conditional custom date fields (`period === 'custom'`), and reset trigger; `HierarchyFilterSelects` supports optional Group cascade (`showGroup`), permanent `"No aplica"` (`includeNoAplicaAlways`), optional `"No scout"` (`includeNoScoutInGroup`), and downward child resets; `MemberHierarchySelects` supports numeric `0` clearing, `hideWhenEmpty`, `layout`, and upward parent hydration via `resolveParentHierarchyForSelection`.
- **Status Semantics**: `MemberStatusBadge` implements the canonical `docs/DESIGN.md` Member Validation Status palette (`emerald`/`purple`/`rose` + Lucide icons) and preserves `"Solvente hasta <fecha>"` when `solventUntil` is passed on active records.

## Verification

- Run: `npm test -- --run`
