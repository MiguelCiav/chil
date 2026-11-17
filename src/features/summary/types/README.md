# Summary Types

## Overview
Defines TypeScript interfaces for consolidated summary table rows (`SummaryRowData`) and filter state (`SummaryFilterState`).

## Interface
- `index.ts:SummaryRowData`: Interface representing a flattened member-batch recognition row (`id`, `issueDate`, `rawDate`, `batchId`, `batchCode`, `recognitionId`, `recognitionName`, `identity`, `firstName`, `lastName`, `fullName`, `unit`, `unitLabel`, `memberType`, `memberTypeLabel`, `status`, `statusLabel`, `exceptionalReason`, `recognitionCode`, `regionId`, `districtId`, `groupId`, `isNationalInstitutional`, `regionName`, `districtName`, `groupName`).
- `index.ts:SummaryFilterState`: Interface representing summary filter controls (`search`, `recognitionType`, `regionId`, `districtId`, `groupId`, `unit`, `memberType`, `status`, `datePeriod`, `startDate`, `endDate`).

## Invariants
- None.

## Side Effects
- None.

## Verification
- Run: `npm test -- --run`
