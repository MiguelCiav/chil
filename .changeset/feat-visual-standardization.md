---
"chil": minor
---

Implement Visual Standardization Plan (Plan Maestro de Estandarización Visual) across all application modules:
- Axis 1: Standardize Module Headers & Typography Hierarchy:
  - Title (`<h1>`): `text-2xl sm:text-3xl font-black text-neutral tracking-tight`
  - Subtitle (`<p>`): `text-xs sm:text-sm text-neutral/70 mt-1`
  - Header Container: `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2`
  - Applied uniformly across `QuickRecognition`, `NewBatchWizard`, `BatchList`, `BatchDetail`, `RecognitionCatalog`, `SummaryView`, `StatisticsDashboard`, and `SuccessPage`.
- Axis 2: Standardize Container Widths & Margins:
  - Standardized main view page container width to `max-w-7xl mx-auto space-y-6 font-sans py-2` (and `space-y-8` for wizard and success views) across all core feature pages.
- Axis 3: Standardize Tables (Design System Table Tokens):
  - Standardized table tokens matching design system across `Table.tsx`, `BatchList.tsx`, `BatchDetail.tsx` (members table), `SuccessPage.tsx` (summary table), `SummaryView.tsx` (master summary table), `RegionSummaryTable.tsx`, and `DistrictSummaryTable.tsx`:
    - Container: `w-full border border-primary/20 rounded-2xl overflow-hidden bg-white shadow-sm`
    - Element: `w-full text-left border-collapse`
    - Thead row: `bg-primary/10 border-b border-primary/20`
    - Header cells `<th>`: `px-6 py-4 text-xs font-bold text-neutral uppercase tracking-wider`
    - Tbody: `divide-y divide-gray-100 bg-white`
    - Rows `<tr>`: `hover:bg-primary/5 transition-colors bg-white`
    - Cells `<td>`: `px-6 py-4 text-sm text-neutral whitespace-nowrap`
    - Footer: `px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-between text-xs font-semibold text-neutral/60`
- Axis 4: Standardize Buttons & Font Scale:
  - Updated `Button.tsx` with Design System token scale (`sm: text-xs`, `md: text-sm`, `lg: text-sm sm:text-base`) and `font-semibold transition-all rounded-xl`.
  - Cleaned up arbitrary button font-size and class overrides across components.
