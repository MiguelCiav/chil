# Chil - System Context & Modules Overview

> **Operational Directive**:
> This document provides a high-level summary of the functionalities for each module across `functions/` and `src/`.
> **It must ONLY be updated when new modules are introduced or significant architectural/functional modifications occur.** Do not include task checklists, git commit histories, or temporary work logs here.

---

## 1. Backend Modules (`functions/`)

The backend is built with **Firebase Cloud Functions (v2)** in Node.js, providing secure callable endpoints and external data scraping.

### Entrypoint
* **`functions/index.js`**: Initializes the Firebase Admin SDK and exports callable HTTPS Cloud Functions (`loginScraper` and `getMemberStatus`).

### Handlers (`functions/handlers/`)
* **`loginScraper.js`**: Validates administrator/scraper credentials (`email`, `password`), performs authentication against the external Venezuelan Scout management portal, caches session cookies in memory, and returns success confirmation.
* **`getMemberStatus.js`**: Fetches Scout member affiliation data by national ID (`cedula`). Reuses cached session cookies for low latency, automatically falling back to re-login if cookies are invalid or expired. Returns normalized member profile data or throws descriptive `HttpsError` exceptions.

### Scraper Utilities (`functions/scraper/`)
* **`auth.js`**: Manages HTTP session authentication with the external portal, cookie extraction, and an in-memory credential-to-cookie cache.
* **`lookup.js`**: Queries member records by `cedula` using active session cookies and parses HTML response tables/fields into structured JavaScript objects.
* **`cookieHelper.js`**: Utility functions for serializing, parsing, and formatting HTTP cookie strings and headers.

---

## 2. Frontend Modules (`src/`)

The frontend is a single-page application built on **React 19**, **TypeScript**, and **Tailwind CSS**, organized using a feature-driven architecture.

### Feature Modules (`src/features/`)

#### 🔐 Auth (`src/features/auth/`)
* **Functionality**: Manages user authentication, session persistence, and access control with Firebase Auth.
* **Components**: `LoginPage`, `RegisterPage`, `ForgotPasswordModal`, `ProtectedRoute` (route guard), `UserProfileMenu` (user avatar, account details, sign-out trigger).
* **Context & Hooks**: `AuthContext` and `useAuth` hook exposing the active user, authentication state, and login/logout methods.
* **API**: `authApi` isolating all Firebase Auth SDK invocations.

#### 📦 Batches (`src/features/batches/`)
* **Functionality**: Manages recognition batch generation workflows, batch progress tracking, and batch inspection.
* **Components**:
  * `NewBatchWizard`: Multi-step wizard to create a recognition batch (selecting templates, assigning recipients/members, and configuring details).
  * `QuickRecognition`: Accelerated single-recognition generation flow.
  * `BatchList`: Paginated and filterable data table displaying all recognition batches and statuses.
  * `BatchDetail`: Detailed inspection view of a specific batch and its recipients.
  * `SuccessPage`: Completion screen providing direct download actions and navigation.
* **API**: Firestore queries and mutations for batch documents and recipient sub-collections.

#### 🏅 Recognitions (`src/features/recognitions/`)
* **Functionality**: Manages certificate templates, visual WYSIWYG certificate designing, and browser-side PDF generation.
* **Components**:
  * `RecognitionCatalog`: Grid view of all configured recognition templates with search and filtering.
  * `RecognitionFormModal` & `RecognitionDeleteModal`: Modals to create, edit, or delete template records.
  * `CertificateDesigner`: Interactive visual canvas designer with drag-and-drop variable placement, alignment guidelines, font settings, and background image customization. Subcomponents include `DesignerCanvas`, `DesignerHeader`, `CanvasFormatBar`, `DraggableField`, and `DesignerSidebar` (`FieldPaletteTab`, `FieldPropertiesTab`, `BackgroundFormatTab`).
* **Services & Utils**:
  * `certificatePdfGenerator`: Generates high-resolution PDF certificates directly in the browser using custom fonts and template coordinates.
  * `snapGuidelines`: Geometric calculations for element snapping and alignment guidelines on the canvas.
  * `imageProcessor`: Background image loading, scaling, and canvas data URL conversion.
* **Hooks**: `useCanvasScale` (responsive canvas zoom/scaling) and `useCanvasDrag` (field dragging physics).
* **API**: Firestore CRUD operations for recognition templates and template assets.

#### 📊 Statistics (`src/features/statistics/`)
* **Functionality**: Computes and displays organizational analytics, historical trends, and demographics across batches and recognitions.
* **Components**:
  * `StatisticsDashboard`: Primary analytics container.
  * `StatKpiGrid`: KPI summary cards (total batches, recognitions issued, active members).
  * `FilterBar`: Date range, region, and district filters.
  * Charts & Tables: `MonthlyTrendChart`, `RecognitionRankingChart`, `DemographicsDonut`, `GeographicBarChart`, `StatusBreakdownCard`, `RegionSummaryTable`, `DistrictSummaryTable`, `UnitDistributionCard`, `YoYVariationBadge`.
* **Utils & Hooks**:
  * `statsCalculators`: Aggregation and statistical math for metric calculations.
  * `statsPdfExport`: Generates downloadable PDF reports containing dashboard statistics and charts.
  * `useStatisticsData`: Custom hook fetching and computing statistics from Firestore collections.

#### 📋 Summary (`src/features/summary/`)
* **Functionality**: Consolidated global table view of all issued recognitions and participant records across batches.
* **Components**:
  * `SummaryView`: Comprehensive data table featuring sorting, searching, date/status filtering, and pagination.
* **Utils**:
  * `excelExport`: Exports filtered summary data into formatted Excel (`.xlsx`) files.

#### 🌐 Landing (`src/features/landing/`)
* **Functionality**: Public marketing page for unauthenticated visitors.
* **Components**: `LandingPage`, `HeroSection` (value proposition & CTA), `FeatureGridSection` (capability overview), `WorkflowSection` (3-step workflow walkthrough), `LandingFooter`.

---

### Core & Shared Modules (`src/`)

#### 🧩 Shared Components (`src/components/`)
* **Atomic UI Primitives**: `Button`, `Card`, `Field`, `Modal`, `Table`, `FloatingTableScrollbar`, `SearchSelectorModal`.
* **Navigation Subsystem (`src/components/navigation/`)**: Responsive `Sidebar` (with desktop collapsible mode and mobile slide-over drawer) and `Navbar`.
* **Walkthrough Subsystem (`src/components/walkthrough/`)**: Interactive guided product tour and onboarding system (`WalkthroughDialog`, `WalkthroughOverlay`, `WalkthroughHelpButton`, `useWalkthrough`).
* **Barrel Export**: `src/components/index.ts` re-exports all primitives and subsystems for unified consumption.

#### 🏷️ Transversal Types (`src/types/`)
* **Domain Models**: Centralized TypeScript types and constants shared across features to prevent cross-feature coupling:
  * `hierarchy.ts`: `Region`, `District`, `ScoutGroup`.
  * `member.ts`: `ScoutUnit`, `SCOUT_UNITS`, `getUnitLabel`, `getUnitBadge`, `MemberStatus`, `ScoutMember`, `MemberVerificationResult`.
  * `batch.ts`: `BatchUnitScope`, `Batch`, `BatchCreationParams`.
  * `filters.ts`: `DatePeriod`, `MemberTypeFilter`.
  * `index.ts`: Unified barrel export.

#### 🗃️ Domain Fixtures & Data (`src/data/`)
* **`hierarchy.json`**: Official geographic hierarchy (regions, districts, and scout groups) used across batch creation, statistics aggregations, and database seeding.

#### 📐 Layouts (`src/layouts/`)
* **`MainLayout.tsx`**: Primary layout shell for authenticated users, combining the responsive `Sidebar`, mobile header bar, and content viewport. Renders a clean container on landing and authentication routes.

#### ⚙️ Infrastructure & Configuration (`src/lib/` & root)
* **`src/lib/firebase.ts`**: Centralized Firebase client SDK initialization (Auth, Firestore, and Functions).
* **`src/App.tsx`**: Top-level application routing, route guards (`ProtectedRoute`), and layout bindings.
* **`src/main.tsx`**: Application entrypoint rendering the React root into the DOM.

---

## 3. Maintenance Scripts & Tooling (`scripts/`)

* **Active Operations (`scripts/`)**:
  * `seed-hierarchy.mjs`: Synchronizes `src/data/hierarchy.json` into Firestore (`npm run seed-hierarchy`).
  * `install-skill.sh`: Helper for installing agent skills into `.agent/skills/`.
* **Historical Migrations (`scripts/migrations/`)**:
  * `distribute-2025-units.mjs`, `import-robots-letales.mjs`, `verify-robots-letales.mjs`: One-off data migration and verification scripts.
