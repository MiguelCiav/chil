---
"chil": minor
---

Implement the Statistics & Analytics Dashboard (Estadísticas):
- Feature Module Architecture (`src/features/statistics/`):
  - Created modular statistics package with components, charts, hooks, pure calculators, and PDF export utility.
- Pure Metric & Aggregation Calculators (`src/features/statistics/utils/statsCalculators.ts`):
  - `calculateKpiMetrics`: Computes total diplomas issued (active + exceptional), batch counts, average members per batch, demographics, active geographic coverage, and validation rate with zero-division safety.
  - `calculateMonthlyTrends`: Aggregates historical diplomas by month with year inference and monthly status breakdowns.
  - `calculateRecognitionRankings`: Ranks top recognitions descending by count with badge styling and percentage share.
  - `calculateDemographics`: Computes Jóvenes vs Adultos breakdown and sub-status distribution.
  - `calculateGeographicBreakdown`: Computes Region and District volume distribution.
  - `calculateStatusBreakdown`: Computes validation health breakdown (Válido, Excepcional, Inválido).
- Interactive SVG Charts (`src/features/statistics/components/charts/`):
  - `MonthlyTrendChart`: Responsive SVG bar chart with grid lines, month labels, hover state highlighting, and interactive tooltip.
  - `RecognitionRankingChart`: Horizontal ranked progress bars with custom recognition badges.
  - `DemographicsDonut`: SVG circular ring/donut chart with central counter and demographic legend cards.
  - `GeographicBarChart`: Ranked list with tab toggle between Regions and Districts.
  - `StatusBreakdownCard`: Segmented horizontal health bar with green/purple/red status indicators.
- Executive PDF Report Generator (`src/features/statistics/utils/statsPdfExport.ts`):
  - Generates institutional executive summary PDF reports via `jsPDF` with KPI summary cards, monthly activity tables, rankings, geographic coverage, and multi-page pagination.
- Navigation & Routing:
  - Added "Estadísticas" navigation link in `src/components/Navbar.tsx` with active indicator.
  - Added `/estadisticas` route in `src/App.tsx`.
- Comprehensive Vitest Test Suites:
  - Created test suites covering calculators, PDF export, custom hook, dashboard rendering, and navigation.
