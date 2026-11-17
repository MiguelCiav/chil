# Summary Utils

## Overview
Provides CSV/Excel-compatible export utilities (`excelExport.ts`) for formatting, RFC-style quoting, UTF-8 BOM prepending, and triggering browser downloads of `SummaryRowData[]`.

## Interface
- `excelExport.ts:SUMMARY_EXCEL_HEADERS`: Constant `string[]` of 14 Spanish column headers.
- `excelExport.ts:formatSummaryRowForExport`: `(row: SummaryRowData) => string[]` extracting the 14 column values for a row.
- `excelExport.ts:generateSummaryCsv`: `(data: SummaryRowData[]) => string` serializing headers and rows with CRLF line endings and UTF-8 BOM (`\uFEFF`).
- `excelExport.ts:exportToExcel`: `(data: SummaryRowData[], filename?: string) => void` generating the CSV and triggering a browser download when `document` is defined.

## Invariants
- `excelExport.ts:formatSummaryRowForExport`: Maps missing/falsy string fields to `''`.
- `excelExport.ts:escapeCsvField`: Returns `'""'` for `null`/`undefined`, stringifies primitives, `JSON.stringify`s other values, and wraps in double quotes escaping internal `"` as `""`.
- `excelExport.ts:exportToExcel`: Defaults `filename` to `Resumen_Reconocimientos_${YYYY-MM-DD}.csv` (from `new Date().toISOString().split('T')[0]`), and appends `.csv` if trimmed filename does not end with `.csv` or `.xlsx` (case-insensitive).

## Side Effects
- `excelExport.ts:exportToExcel`: When `typeof document !== 'undefined'`, creates a `Blob` (`text/csv;charset=utf-8;`), calls `URL.createObjectURL` / `URL.revokeObjectURL`, appends a temporary `<a>` element to `document.body`, calls `link.click()`, and removes it.

## Verification
- Run: `npm test -- --run`
