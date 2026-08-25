---
"chil": minor
---

Implement exceptional recognition emission and manual approval (Emisión Excepcional):
- Models & Types:
  - Added `export type MemberStatus = 'active' | 'pending' | 'exceptional'` in `src/features/batches/types/index.ts` and updated `ScoutMember`.
  - Updated `SummaryRowData` and `SummaryFilterState` in `src/features/summary/types/index.ts` to recognize `'exceptional'` status and `'Emisión Excepcional'` label.
- Modal de Edición de Miembro:
  - Added "Autorizar emisión de diploma (Caso Excepcional)" toggle card in `BatchDetail.tsx` and `Step3Review.tsx` for non-validated members with explanatory text and code auto-generation.
- Certificate & PDF Generation:
  - Updated `generateBatchCertificatesPdf` and `downloadSingleCertificatePdf` in `certificatePdfGenerator.ts` to support both `active` and `exceptional` members.
  - Enabled individual diploma download in `BatchDetail.tsx` for `active` and `exceptional` members.
- UI & Semantic Badges:
  - Updated status badge styling across `BatchDetail.tsx`, `Step3Review.tsx`, `SuccessPage.tsx`, and `SummaryView.tsx`:
    - `active`: `● Registro Válido` (green)
    - `exceptional`: `● Emisión Excepcional` (purple)
    - `pending`: `● Registro Inválido` (red)
  - Updated `SummaryView.tsx` status filter options and Excel export with `Emisión Excepcional`.
  - Updated `codeGenerator.ts` to assign codes in auto mode to both active and exceptional members.
- Comprehensive Unit Tests:
  - Updated and added tests in `BatchDetail.test.tsx`, `Step3Review.test.tsx`, `certificatePdfGenerator.test.ts`, `SummaryView.test.tsx`, `excelExport.test.ts`, and `codeGenerator.test.ts`.
