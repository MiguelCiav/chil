---
"chil": minor
---

Implement conditional Year-over-Year (YoY) comparison across the Statistics Dashboard, calculation utilities, table components, and executive PDF exporter:
- Pure Statistical Logic & Calculators (`src/features/statistics/utils/statsCalculators.ts`):
  - `calculatePercentChange`: Computes percentage variation between current and previous periods with division-by-zero protection.
  - `partitionDataByYear`: Filters and partitions batch and member datasets across current and prior comparative years.
  - `calculateYoYComparison`: Computes comprehensive YoY metrics for KPIs, Regions, Districts, Scout Units, Demographics (Jóvenes vs Adultos), and Monthly Trends.
- Reusable UI Components:
  - `YoYVariationBadge`: Renders color-coded indicator badges displaying positive (+green), negative (-red), and neutral (=slate) absolute and percentage variations.
- Dashboard & Section Components (`src/features/statistics/components/`):
  - `StatKpiGrid`: Displays subtle YoY variation badges below Total Reconocimientos, Total Lotes, and Demografía metrics.
  - `RegionSummaryTable`: Conditionally renders comparative columns (`Total (${currentYear})`, `Año Anterior (${previousYear})`, `Variación`, `% del Total`).
  - `DistrictSummaryTable`: Conditionally renders comparative columns (`Región`, `Distrito`, `Total (${currentYear})`, `Año Anterior (${previousYear})`, `Variación`, `% del Total`).
  - `UnitDistributionCard`: Conditionally renders comparative columns for all Scout Units and Institutional categories.
  - `DemographicsDonut`: Adds comparative demographic table comparing current vs prior year metrics for young and adult members.
  - `MonthlyTrendChart`: Integrates dual-bar comparative SVG chart (current vs prior year) with chart legend, interactive tooltips, and comparative summary table.
  - Fallback Handling: Automatically falls back to standard single-year table views when historical data for the prior year is unavailable.
- Executive PDF Report Exporter (`src/features/statistics/utils/statsPdfExport.ts`):
  - Generates comparative header subtitle `Reporte Comparativo Anual (${previousYear} vs ${currentYear})` when YoY data is present.
  - Generates multi-column comparative tables across Region, District, Unit, Demographics, and Monthly sections.
  - Draws comparative dual-bar vector histogram chart for monthly trend comparison.
- Test Suites & Quality Gate:
  - Added unit test suites covering YoY calculations, PDF generator, hook updates, badge component, and multi-year dashboard integration.
