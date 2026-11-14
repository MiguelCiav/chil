# Batch Detail Components

## Overview
UI subcomponents, TanStack Table column definitions, tour steps, and modals used by `BatchDetail` to display batch metadata, demographic summaries, member tables, and individual member quick views or edits.

## Interface
- `index.ts: *` (re-exports `./types`, `./batchDetailTour`, `./batchDetailColumns`, `./BatchDetailHeader`, `./BatchReportControls`, `./BatchMembersTable`, `./BatchSummaryCards`, `./DeleteBatchModal`, `./EditMemberModal`, `./MemberQuickViewModal`)
- `types.ts:BatchDetailTotals`, `types.ts:MemberActionsCellProps`
- `batchDetailTour.ts:BATCH_DETAIL_TOUR_STEPS`
- `batchDetailColumns.tsx:renderMemberIdentityCell`, `batchDetailColumns.tsx:renderMemberNameCell`, `batchDetailColumns.tsx:renderMemberUnitCell`, `batchDetailColumns.tsx:renderMemberTypeCell`, `batchDetailColumns.tsx:renderMemberStatusCell`, `batchDetailColumns.tsx:renderMemberCodeCell`, `batchDetailColumns.tsx:renderMemberActionsCell`, `batchDetailColumns.tsx:createBatchDetailColumns`
- `BatchDetailHeader.tsx:BatchDetailHeader`, `BatchDetailHeader.tsx:BatchDetailHeaderProps` (`reportBuckets`, `isListEmpty`, `onDownloadMemberList: (bucketKey?: ReportBucketKey) => void`)
- `BatchReportControls.tsx:BatchReportControls`, `BatchReportControls.tsx:BatchReportControlsProps`
- `BatchMembersTable.tsx:BatchMembersTable`, `BatchMembersTable.tsx:BatchMembersTableProps`
- `BatchSummaryCards.tsx:BatchSummaryCards`, `BatchSummaryCards.tsx:BatchSummaryCardsProps` (renders 3 summary cards: `Tipo de Reconocimiento`, `Resumen de Miembros`, and `Comentarios / Observaciones`)
- `DeleteBatchModal.tsx:DeleteBatchModal`, `DeleteBatchModal.tsx:DeleteBatchModalProps` (re-exported from `../shared/DeleteBatchModal`)
- `EditMemberModal.tsx:EditMemberModal`, `EditMemberModal.tsx:EditMemberModalProps` (re-exported from `../shared/EditMemberModal`)
- `MemberQuickViewModal.tsx:MemberQuickViewModal`, `MemberQuickViewModal.tsx:MemberQuickViewModalProps`

## Invariants
- `batchDetailColumns.tsx:createBatchDetailColumns` resolves each member's `Grupo` cell via `info.row.original.group_id ?? batch?.group_id`, returning `'No aplica'` for `0` or falsy IDs and `` `Grupo ${memberGroupId}` `` when the ID is absent from `groups`.
- `batchDetailColumns.tsx:renderMemberActionsCell` renders the PDF download action only when `rowData.status` is `'active'` or `'exceptional'`, and flips dropdown placement (`bottom-full` vs `top-full`) when the row is near the bottom of the table.
- `BatchDetailHeader.tsx:BatchDetailHeader` disables the ZIP certificates download button when `downloadingCertificatesZip || isEligibleZero`, delegates PDF list export to `BatchReportControls`, and right-aligns the header action bar (`justify-end`, `xl:ml-auto`).
- `BatchReportControls.tsx:BatchReportControls` disables PDF list controls (`downloadingReport || isListEmpty`) with an empty-list tooltip when `isListEmpty` is true, renders the `"Por grupo"` menu only when `buckets.length > 1`, omits `districtName` when `null` or `'No aplica'`, inserts a divider before `'special'` buckets only when preceded by `'group'` buckets, and closes `menuOpen` on menu item selection.
- `BatchMembersTable.tsx:BatchMembersTable` paginates in slices of 10 rows for the "Mostrando" range label, caps visible numbered page buttons to 5, and right-aligns pagination controls (`justify-end w-full sm:w-auto`).
- `MemberQuickViewModal.tsx:MemberQuickViewModal` renders its `ModalBody` only when `member` is non-null, and falls back to `batchGroup || 'No aplica'` whenever `!member.group_id || member.group_id === 0` (which displays `batchGroup` even if `member.group_id` was explicitly cleared to `0`).

## Side Effects
- `BatchReportControls.tsx:BatchReportControls` registers and cleans up `document` `mousedown` and `keydown` event listeners inside `useEffect` while `menuOpen` is true to close the `"Por grupo"` menu on outside clicks or `Escape`.
- All other components in `batches/components/detail` are presentational and callback-driven, delegating mutations and exports to parent callbacks.

## Verification
- Run: `npm test`
