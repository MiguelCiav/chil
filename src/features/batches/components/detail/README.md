# Batch Detail Components

## Overview
UI subcomponents, TanStack Table column definitions, tour steps, and modals used by `BatchDetail` to display batch metadata, demographic summaries, member tables, and individual member quick views or edits.

## Interface
- `index.ts: *` (re-exports `./types`, `./batchDetailTour`, `./batchDetailColumns`, `./BatchDetailHeader`, `./BatchMembersTable`, `./BatchSummaryCards`, `./DeleteBatchModal`, `./EditMemberModal`, `./MemberQuickViewModal`)
- `types.ts:BatchDetailTotals`, `types.ts:MemberActionsCellProps`
- `batchDetailTour.ts:BATCH_DETAIL_TOUR_STEPS`
- `batchDetailColumns.tsx:renderMemberIdentityCell`, `batchDetailColumns.tsx:renderMemberNameCell`, `batchDetailColumns.tsx:renderMemberUnitCell`, `batchDetailColumns.tsx:renderMemberTypeCell`, `batchDetailColumns.tsx:renderMemberStatusCell`, `batchDetailColumns.tsx:renderMemberCodeCell`, `batchDetailColumns.tsx:renderMemberActionsCell`, `batchDetailColumns.tsx:createBatchDetailColumns`
- `BatchDetailHeader.tsx:BatchDetailHeader`, `BatchDetailHeader.tsx:BatchDetailHeaderProps`
- `BatchMembersTable.tsx:BatchMembersTable`, `BatchMembersTable.tsx:BatchMembersTableProps`
- `BatchSummaryCards.tsx:BatchSummaryCards`, `BatchSummaryCards.tsx:BatchSummaryCardsProps`
- `DeleteBatchModal.tsx:DeleteBatchModal`, `DeleteBatchModal.tsx:DeleteBatchModalProps` (re-exported from `../shared/DeleteBatchModal`)
- `EditMemberModal.tsx:EditMemberModal`, `EditMemberModal.tsx:EditMemberModalProps` (re-exported from `../shared/EditMemberModal`)
- `MemberQuickViewModal.tsx:MemberQuickViewModal`, `MemberQuickViewModal.tsx:MemberQuickViewModalProps`

## Invariants
- `batchDetailColumns.tsx:renderMemberActionsCell` renders the PDF download action only when `rowData.status` is `'active'` or `'exceptional'`.
- `BatchDetailHeader.tsx:BatchDetailHeader` disables the ZIP certificates download button when `downloadingCertificatesZip || isEligibleZero`.
- `BatchMembersTable.tsx:BatchMembersTable` paginates in slices of 10 rows for the "Mostrando" range label and caps visible numbered page buttons to 5.
- `MemberQuickViewModal.tsx:MemberQuickViewModal` renders its `ModalBody` only when `member` is non-null.

## Side Effects
- None (pure presentational and callback-driven UI components; mutations are delegated to parent callbacks).

## Verification
- Run: `npm test`
