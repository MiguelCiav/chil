# Summary Types

## Overview
Defines TypeScript interfaces for consolidated summary table rows (`SummaryRowData`) and a legacy filter state interface (`SummaryFilterState`, currently unused in favor of `SummaryFilterValues` in `../utils/summaryHelpers.ts`).

## Interface
- `index.ts:SummaryRowData`: Interface representing a flattened member-batch recognition row (`id`, `issueDate`, `rawDate`, `batchId`, `batchCode`, `recognitionId`, `recognitionName`, `identity`, `firstName`, `lastName`, `fullName`, `unit`, `unitLabel`, `memberType`, `memberTypeLabel`, `status`, `statusLabel`, `exceptionalReason`, `recognitionCode`, `regionId`, `districtId`, `groupId`, `isNationalInstitutional`, `regionName`, `districtName`, `groupName`).
- `index.ts:SummaryFilterState`: Legacy interface representing summary filter controls (`search`, `recognitionType`, `regionId`, `districtId`, `groupId`, `unit`, `memberType`, `status`, `datePeriod`, `startDate`, `endDate`); currently unused anywhere in `src/` (runtime filter state is typed via `SummaryFilterValues` in `../utils/summaryHelpers.ts`).

## Invariants
- None.

## Side Effects
- None.

## Verification
- Run: `npm test -- --run`
