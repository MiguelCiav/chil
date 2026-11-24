# Batch Detail Components

## Overview
UI subcomponents, TanStack Table column definitions, tour steps, and modals used by `BatchDetail` to display batch metadata, demographic summaries, member tables, and individual member quick views or edits.

## Interface
- `index.ts: *` (re-exports `./types`, `./batchDetailTour`, `./batchDetailColumns`, `./ScopedExportSplitButton`, `./BatchDetailHeader`, `./BatchReportControls`, `./BatchMembersTable`, `./BatchSummaryCards`, `./BatchTerritorialCard`, `./MemberQuickViewModal`, `./ManualCodeAssignmentModal`, `./DeleteMemberModal`, `./AddSingleMemberCard`)
- `types.ts:BatchDetailTotals`, `types.ts:MemberActionsCellProps`
- `batchDetailTour.ts:BATCH_DETAIL_TOUR_STEPS`
- `batchDetailColumns.tsx:renderMemberIdentityCell`, `batchDetailColumns.tsx:renderMemberNameCell`, `batchDetailColumns.tsx:renderMemberUnitCell`, `batchDetailColumns.tsx:renderMemberTypeCell`, `batchDetailColumns.tsx:renderMemberStatusCell`, `batchDetailColumns.tsx:renderMemberCodeCell`, `batchDetailColumns.tsx:renderMemberActionsCell`, `batchDetailColumns.tsx:createBatchDetailColumns`
- `ScopedExportSplitButton.tsx:ScopedExportSplitButton`, `ScopedExportSplitButton.tsx:ScopedExportSplitButtonProps`
- `BatchDetailHeader.tsx:BatchDetailHeader`, `BatchDetailHeader.tsx:BatchDetailHeaderProps` (`batch`, `startTour`, `onDeleteClick`, `reportBuckets`, `eligibleBuckets`, `isListEmpty`, `onDownloadMemberList`, `downloadingReport`, `onDownloadCertificatesZip`, `downloadingCertificatesZip`, `isEligibleZero`, `disableDelete`)
- `BatchReportControls.tsx:BatchReportControls`, `BatchReportControls.tsx:BatchReportControlsProps`
- `BatchMembersTable.tsx:BatchMembersTable`, `BatchMembersTable.tsx:BatchMembersTableProps`
- `BatchSummaryCards.tsx:BatchSummaryCards`, `BatchSummaryCards.tsx:BatchSummaryCardsProps` (renders 3 summary cards: `Tipo de Reconocimiento`, `Resumen de Miembros`, and `Comentarios / Observaciones`)
- `BatchTerritorialCard.tsx:BatchTerritorialCard`, `BatchTerritorialCard.tsx:BatchTerritorialCardProps` (renders 4th card `"Distribución Territorial del Lote"` with `Regiones`, `Distritos`, `Grupos` count-sorted lists and special bars)
- `MemberQuickViewModal.tsx:MemberQuickViewModal`, `MemberQuickViewModal.tsx:MemberQuickViewModalProps`
- `ManualCodeAssignmentModal.tsx:ManualCodeAssignmentModal`, `ManualCodeAssignmentModal.tsx:ManualCodeAssignmentModalProps`, `ManualCodeAssignmentModal.tsx:ManualCodeAssignmentItem`
- `DeleteMemberModal.tsx:DeleteMemberModal`, `DeleteMemberModal.tsx:DeleteMemberModalProps`
- `AddSingleMemberCard.tsx:AddSingleMemberCard`, `AddSingleMemberCard.tsx:AddSingleMemberCardProps`, `AddSingleMemberCard.tsx:VerifySingleAddResult`

## Invariants
- `batchDetailColumns.tsx:createBatchDetailColumns` and `MemberQuickViewModal.tsx:MemberQuickViewModal` resolve each member's `groupId` via `resolveMemberHierarchy(member, batch ?? undefined, { regions: [], districts: [], groups }).groupId`, returning `'No aplica'` when `groupId === 0` (including explicit `0` overrides and `unit === 'no_scout'`) and `` `Grupo ${groupId}` `` when a positive ID is absent from `groups`.
- `BatchTerritorialCard.tsx:BatchTerritorialCard` caps `Regiones`, `Distritos`, and `Grupos` lists at 3 rows when collapsed, shows a single shared `"Ver más"` / `"Ver menos"` toggle when any list has `> 3` items, displays `"Ninguna registrada"` (`Regiones`) or `"Ninguno registrado"` (`Distritos`, `Grupos`) when empty, and conditionally renders `"Miembros no scout"` (`noScoutCount > 0`) and `"Sin grupo asignado"` (`ungroupedScoutCount > 0`) bars.
- `batchDetailColumns.tsx:renderMemberActionsCell` keys row menus by `getMemberDocId(rowData)`, renders `"Re-verificar en Impeesa"` only when `isReverifiableMember(rowData)` is true, renders PDF download only when `status` is `'active'` or `'exceptional'`, renders `"Eliminar miembro"` disabled with a Spanish tooltip when `!canDeleteMembers || isReverifying`, closes the dropdown on every action click, and flips dropdown placement near the bottom of the table.
- `BatchDetailHeader.tsx:BatchDetailHeader` renders a formatted batch code badge (`LT-${year}-${paddedId}`), uses `<Button variant="destructive" disabled={disableDelete}>` for `"Eliminar Lote"`, renders ZIP certificates export through `ScopedExportSplitButton`, delegates PDF list export to `BatchReportControls`, and right-aligns the header action bar (`justify-end`, `xl:ml-auto`).
- `BatchReportControls.tsx:BatchReportControls` delegates PDF list export to `ScopedExportSplitButton` (`variant="outline"`, `chevronAriaLabel="Opciones de lista por grupo"`) and disables controls (`downloadingReport || isListEmpty`) with an empty-list tooltip when `isListEmpty` is true.
- `ScopedExportSplitButton.tsx:ScopedExportSplitButton` renders the chevron trigger (`chevronAriaLabel`) and scoped menu (`role="menu"`, `menuAriaLabel`) only when `buckets.length > 1`, disables both segments when `loading || disabled`, omits `districtName` when `null` or `'No aplica'`, inserts an `<hr>` divider (implicit `separator` ARIA role) before the first non-`'group'` bucket only when `'group'` buckets precede it, and closes the menu on item selection.
- `BatchMembersTable.tsx:BatchMembersTable` renders `<Card>`, optional `"Re-verificar (N)"` toolbar button with live `"Verificando X de N..."` progress when `reverifiableCount > 0`, `<SearchInput size="sm">`, `<DataTable bordered={false}>`, and `<Pagination mode="numbered" counterFormat="range" itemLabel="miembros">` from the `table` prop (pagination page size `10` and `autoResetPageIndex: false` clamping configured in `BatchDetail.tsx`).
- `ManualCodeAssignmentModal.tsx:ManualCodeAssignmentModal` validates one unique uppercase code per newly-active member against `existingCodes`, other rows in the modal, and each row's non-reusable `previousCode` (`validateManualRecognitionCode`), and shows an inline amber notice when `sessionExpiredMidRun` is true.
- `DeleteMemberModal.tsx:DeleteMemberModal` displays member status via `<MemberStatusBadge />` and renders an amber warning when removing a member who already holds a `recognition_code`.
- `AddSingleMemberCard.tsx:AddSingleMemberCard` implements a 2-step inline `verify -> preview -> add` flow rejecting empty, generic, `'/'`, and duplicate normalized cédulas inline, invalidating previews on input change, consuming the 4-branch `VerifySingleAddResult` union, and allowing `active` (with auto/manual code) or `pending` (with amber warning) additions.
- `batchDetailColumns.tsx:createBatchDetailColumns` re-exports canonical member cell renderers from `../shared/memberColumns`.
- `MemberQuickViewModal.tsx:MemberQuickViewModal` renders its `ModalBody` only when `member` is non-null and displays member status with `<MemberStatusBadge />`.

## Side Effects
- `ScopedExportSplitButton.tsx:ScopedExportSplitButton` registers and cleans up `document` `mousedown` and `keydown` event listeners inside `useEffect` while `menuOpen` is true to close the scoped dropdown menu on outside clicks or `Escape`.
- All other components in `batches/components/detail` are presentational and callback-driven, delegating mutations and exports to parent callbacks.

## Verification
- Run: `npm test -- --run`
