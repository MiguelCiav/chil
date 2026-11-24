<div align="center">
  <img src="src/assets/CHIL_LOGO.png" alt="Chil logo" width="180" />
  <h1>Chil</h1>
  <p>
    Scout recognition batch-management platform for verifying Impeesa registrations, designing certificate templates, exporting bulk PDFs, and tracking territorial analytics.
  </p>

  <p>
    <a href="https://github.com/MiguelCiav/chil/actions/workflows/ci.yml">
      <img src="https://github.com/MiguelCiav/chil/actions/workflows/ci.yml/badge.svg" alt="CI" />
    </a>
    <a href="https://sonarcloud.io/summary/new_code?id=MiguelCiav_chil">
      <img src="https://sonarcloud.io/api/project_badges/measure?project=MiguelCiav_chil&metric=alert_status" alt="SonarCloud Quality Gate" />
    </a>
    <a href="https://sonarcloud.io/summary/new_code?id=MiguelCiav_chil">
      <img src="https://sonarcloud.io/api/project_badges/measure?project=MiguelCiav_chil&metric=coverage" alt="SonarCloud Coverage" />
    </a>
    <img src="https://img.shields.io/badge/Node.js-v22-339933?logo=nodedotjs&logoColor=white" alt="Node.js v22" />
    <img src="https://img.shields.io/badge/Tested%20with-Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
    <a href="LICENSE">
      <img src="https://img.shields.io/badge/License-GPL--3.0-blue.svg" alt="License: GPL-3.0" />
    </a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=0A0A0A" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4" />
    <img src="https://img.shields.io/badge/Firebase-12-DD2C00?logo=firebase&logoColor=white" alt="Firebase" />
    <img src="https://img.shields.io/badge/Vercel-Scraper_API-000000?logo=vercel&logoColor=white" alt="Vercel Scraper API" />
    <a href="AGENTS.md">
      <img src="https://img.shields.io/badge/AI--Agent_Friendly-AGENTS.md-8C4E37" alt="AI-Agent Friendly" />
    </a>
    <a href="docs/designs/SITEMAP.md">
      <img src="https://img.shields.io/badge/Built_with-Elephant--Goldfish_Model_(EGM)-5B4B8A" alt="Built with Elephant-Goldfish Model (EGM)" />
    </a>
  </p>
</div>

---

## Core Capabilities

- **2-Step Batch Wizard & Concurrent Impeesa Verification**: Paste cédulas, verify registration and solvency against Impeesa in batches, and review `Active`, `Pending`, `Exceptional`, or external `No scout` records before emission.
- **Post-Emission Member Lifecycle**: Re-verify `Pending` and `Exceptional` members individually or in bulk, edit permitted fields with post-emission immutability guards, add missing members one by one, and safely remove records.
- **Deterministic Batch Merge**: Consolidate two or more batches into one unified batch, deduplicating repeated cédulas by status rank (`active > exceptional > pending`) and surfacing cross-identity manual code warnings.
- **Visual Certificate Template Designer**: Drag-and-drop canvas supporting image and PDF backgrounds, dynamic data fields, institutional fonts, magnetic alignment guidelines, and `Ctrl+Z` / `Ctrl+Y` undo/redo history.
- **ZIP & Individual PDF Exports**: Generate per-member certificates in a single `.zip` archive (full batch or scoped by territory/group) with live progress and cancellation, or download individual PDFs from the batch detail table.
- **Master Summary & YoY Statistics**: Search and filter across all issued batches (`Resumen` with UTF-8 CSV export), and inspect verified-only analytics by region, district, scout group, unit, demographics, and month (`Estadísticas` with Year-over-Year comparisons and A4 PDF reports).
- **Interactive Walkthroughs**: Built-in step-by-step tours in key workflows (`NewBatchWizard`, `BatchDetail`, and `CertificateDesigner`) plus a responsive collapsible sidebar.

---

## AI-Agent Friendly Architecture (Elephant-Goldfish Model)

Chil is structured so AI coding agents can navigate, reason about, and modify subsystems without guessing architectural rules or reading the entire codebase first. It follows the **Elephant-Goldfish Model (EGM)**:

- **[`AGENTS.md`](AGENTS.md)**: Root operational manual defining layer boundaries (`src/components/` stays domain-agnostic, `src/domain/components/` holds Scout-domain UI, `src/features/` isolates feature slices), dual-backend parity rules, Firestore security constraints, and build/test traps.
- **Module Blueprints (`README.md` per directory)**: Every feature (`auth`, `batches`, `landing`, `recognitions`, `statistics`, `summary`), subdirectory (`api/`, `components/`, `hooks/`, `types/`, `utils/`), and shared layer (`src/domain/components/`, `src/utils/`) maintains an up-to-date `README.md` documenting its exports, invariants, and side effects.
- **[`docs/designs/SITEMAP.md`](docs/designs/SITEMAP.md) & Design Specs (`docs/designs/`)**: Every major feature is drafted, reviewed by specialized Goldfish personas, and tracked from `Proposed` to `Implemented`.
- **Project Skills (`.agent/skills/`)**: Local skills (`chil-elephant`, `composition-patterns`, `react-best-practices`) encode project-specific architectural and React 19 conventions.

---

## Architecture & Repository Map

```text
chil/
├── src/
│   ├── components/           # Domain-agnostic UI primitives (Button, Card, Modal, DataTable, Field, etc.)
│   ├── domain/components/    # Scout-domain shared UI & navigation (Sidebar, ScraperSettingsModal, FilterCard)
│   ├── features/             # Feature slices: auth, batches, landing, recognitions, statistics, summary
│   ├── context/              # Shared React contexts (ScraperSettingsContext)
│   ├── layouts/              # Authenticated/public app shell (MainLayout)
│   ├── lib/                  # Firebase client initialization & session cache helpers
│   ├── types/                # Shared TypeScript domain contracts
│   └── utils/                # Cross-feature hierarchy & date-period utilities
├── functions/                # Firebase Cloud Functions (2nd Gen, Node 22 CommonJS)
├── scraper-api/              # Standalone Vercel serverless mirror for Impeesa scraping
├── scripts/                  # Hierarchy seeding & Firestore maintenance migrations
└── docs/                     # Design specs, operational guides, and user documentation
```

> [!NOTE]
> **Dual-Backend Scraper Parity**: Both `functions/` and `scraper-api/` expose the same four endpoints (`saveScraperSession`, `getScraperSessionStatus`, `clearScraperSession`, `getMemberStatus`). When `VITE_SCRAPER_API_URL` is configured, the frontend routes scraper calls to `scraper-api/` on Vercel; otherwise it uses Firebase Callables. Any scraper or contract change must be mirrored in both backends. See [`docs/ROLLBACK_FIREBASE_FUNCTIONS.md`](docs/ROLLBACK_FIREBASE_FUNCTIONS.md) for the full Firebase rollback procedure.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript 5.8, Vite 7, Tailwind CSS 4, React Router (`HashRouter`), TanStack Table, React Hook Form, Zod, Lucide React |
| **Documents & Archives** | `jsPDF`, `pdfjs-dist`, `JSZip` |
| **Backend & Cloud** | Cloud Firestore, Firebase Auth, Firebase Hosting, Firebase Cloud Functions (Node.js 22), Vercel Serverless Functions (`scraper-api/`) |
| **Testing & Quality** | Vitest (`jsdom`), Testing Library, ESLint, SonarCloud, GitHub Actions |

---

## Prerequisites

- **[Node.js](https://nodejs.org/)**: `v22` (aligned with `functions/package.json` and `.github/workflows/ci.yml`)
- **[Firebase CLI](https://firebase.google.com/docs/cli)**: `npm install -g firebase-tools`

---

## Installation & Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MiguelCiav/chil.git
   cd chil
   ```

2. **Install root frontend dependencies:**
   ```bash
   npm install
   ```

3. **Install Firebase Functions dependencies:**
   ```bash
   npm --prefix functions install
   ```

4. **Install Vercel scraper dependencies (optional, for local `scraper-api/` work):**
   ```bash
   npm --prefix scraper-api install
   ```

5. **Start the local development server (pinned to port `1420`):**
   ```bash
   npm run dev
   ```

6. **Start Firebase Functions emulator (optional):**
   ```bash
   npm --prefix functions run serve
   ```

---

## Testing, Linting & Coverage

Run the full quality pipeline from the repository root:

```bash
npm run lint
npm run build
npm test -- --run
```

- **Unified Vitest suite**: `npm test -- --run` runs tests across `src/`, `functions/__tests__/`, and `scraper-api/__tests__/`. Avoid running `npm test` without `-- --run` in CI or scripts, as it launches watch mode.
- **Coverage report**: `npx vitest run --coverage` generates reports under `coverage/` for `src/**/*.{ts,tsx}`, `functions/**/*.js`, and `scraper-api/**/*.js`.
- **Important**: `scraper-api/package.json` intentionally defines no `build` or `test` script; always run tests and builds from the repository root.

---

## Deployment

- **Frontend + Firestore Rules & Indexes (current CI setup while `scraper-api/` runs on Vercel):**
  ```bash
  firebase deploy --only hosting,firestore
  ```
- **Full Firebase Stack (after GCP Blaze billing is active and `scraper-api/` is retired):**
  ```bash
  firebase deploy
  ```

---

## Documentation Index

| Document | Description |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Operational rules and architectural boundaries for AI coding agents |
| [`docs/designs/SITEMAP.md`](docs/designs/SITEMAP.md) | Index and implementation status of all design documents |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Visual design direction, palette, and typography |
| [`docs/GUIA_COOPERADORES_NACIONALES.md`](docs/GUIA_COOPERADORES_NACIONALES.md) | Step-by-step Spanish user guide for national cooperators |
| [`docs/HIERARCHY_MAINTENANCE.md`](docs/HIERARCHY_MAINTENANCE.md) | Guide for updating Scout region, district, and group hierarchy data |
| [`docs/ROLLBACK_FIREBASE_FUNCTIONS.md`](docs/ROLLBACK_FIREBASE_FUNCTIONS.md) | Procedure to retire Vercel `scraper-api/` and restore 100% Firebase Functions |

---

## License

Licensed under the [GNU General Public License v3.0](LICENSE).
