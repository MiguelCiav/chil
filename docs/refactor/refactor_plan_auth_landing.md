# Module Analysis & Refactoring Plan: Authentication & Public Landing

**Target Modules:** `src/features/auth/` and `src/features/landing/`  
**Integration Points:** `src/App.tsx`, `src/layouts/MainLayout.tsx`, `src/components/navigation/Sidebar.tsx`  
**Author:** Antigravity Engineering (Senior Full-Stack & Architecture Agent)  
**Date:** November 2026  
**Status:** Complete Refactoring Specification (READ-ONLY Analysis)

---

## Executive Summary

The **Authentication** (`src/features/auth/`) and **Public Landing** (`src/features/landing/`) modules form the public entry, user security gateway, and initial brand presentation of the **Chil** platform. 

While the functional implementation is clean, modular, and features custom Venezuelan Scout aesthetics (warm earth tones, scout cartographic textures, and tailored Spanish messaging), our architectural audit identified several high-impact opportunities for optimization:
1. **Critical Performance Bottleneck (Monolithic Bundling & Heavy Assets):** `src/App.tsx` statically imports all core features (`batches`, `recognitions`, `statistics`, `summary`) and heavy libraries (`jspdf`, `jszip`, `@tanstack/react-table`). Consequently, public landing visitors download several megabytes of administrative code before seeing the hero page. Furthermore, the brand logo asset (`src/assets/CHIL_LOGO.png`) is uncompressed at **1.3 MB**, significantly impairing initial paint and Largest Contentful Paint (LCP) metrics.
2. **Configuration & Environment Security:** Firebase configuration in `src/lib/firebase.ts` hardcodes production project keys directly in client source code without environment variable indirection (`import.meta.env`).
3. **State Synchronization & Registration Race Condition:** In `registerWithEmail`, Firebase Auth triggers `onAuthStateChanged` immediately upon `createUserWithEmailAndPassword` before `updateProfile` updates the user's `displayName`, occasionally creating a race condition where initial session state holds a `null` display name.
4. **Layout & Routing Technical Debt:** `MainLayout.tsx` relies on runtime pathname matching heuristics (`isLandingPage`, `isAuthPage`) instead of clean nested layout routes (`<Route element={<AppLayout />}><Outlet /></Route>`), and `ProtectedRoute` is manually repeated across 9 individual route definitions instead of serving as a consolidated route guard.
5. **Form Architecture Inconsistency:** `LoginPage` and `RegisterPage` employ `react-hook-form` with Zod resolvers, whereas `ForgotPasswordModal` manually manages component state with `useState` and inlines validation.

---

## 1. Domain Responsibility & Architectural Overview

### 1.1 Domain Boundaries

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                               src/App.tsx                                   │
│                        (Root HashRouter & AuthProvider)                     │
└───────────────────────┬─────────────────────────────┬───────────────────────┘
                        │                             │
          Unauthenticated / Public           Authenticated / Guarded
                        ▼                             ▼
       ┌──────────────────────────────┐     ┌────────────────────────────────┐
       │     src/features/landing     │     │      src/features/auth         │
       │                              │     │       (ProtectedRoute)         │
       │  • HeroSection               │     └──────────────┬─────────────────┘
       │  • FeatureGridSection        │                    │
       │  • WorkflowSection           │                    ▼
       │  • LandingFooter             │     ┌────────────────────────────────┐
       │                              │     │   Protected App Domains        │
       └──────────────────────────────┘     │   • /lotes (batches)           │
                        ▲                   │   • /reconocimientos (catalog) │
                        │                   │   • /estadisticas (dashboard)  │
       ┌──────────────────────────────┐     │   • /resumen (summary)         │
       │     src/features/auth        │     └────────────────────────────────┘
       │                              │
       │  • LoginPage                 │
       │  • RegisterPage              │
       │  • ForgotPasswordModal       │
       │  • UserProfileMenu           │
       └──────────────────────────────┘
```

#### `src/features/auth/`
- **Identity & Session Management:** Encapsulates Firebase Authentication v12 API wrappers (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `signOut`, `sendPasswordResetEmail`, `onAuthStateChanged`).
- **Domain State Provider (`AuthContext` & `useAuth`):** Exposes `user: AuthUser | null`, `loading: boolean`, and asynchronous action handlers (`login`, `register`, `logout`, `resetPassword`).
- **Route Guarding (`ProtectedRoute`):** Guards protected endpoints, rendering an accessible verification spinner during authentication resolution, and redirecting unauthenticated users to `/login` with stored return path state.
- **User Presentation (`UserProfileMenu`):** Renders the user avatar (photo or calculated initials), user email/name, and provides a keyboard-navigable sign-out dropdown in the navigation shell.

#### `src/features/landing/`
- **Brand Storytelling & Value Proposition:** Features high-impact hero typography, atmospheric background gradients, and an intricate vector topographic trail map representing scout exploration and cartography.
- **Feature Showcase (`FeatureGridSection`):** Highlighting the 6 pillars of Chil: *Emisión Rápida*, *Lotes Masivos*, *Diseñador de Plantillas*, *Unidades Scouts & No Scout*, *Analítica Territorial*, and *Aislamiento y Seguridad*.
- **Onboarding Workflow (`WorkflowSection`):** Clarifies the 3-step operational lifecycle: *Configurar*, *Verificar*, *Emitir*.
- **Conversion Funnel:** Directs users towards `/login` and `/registro` actions via both header/hero and footer navigation.

### 1.2 Authentication Lifecycle & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Browser
    participant Comp as LoginPage / RegisterPage
    participant Ctx as AuthContext (useAuth)
    participant API as auth/api (Firebase Auth)
    participant FB as Firebase Backend
    participant Guard as ProtectedRoute

    Note over User,FB: Session Initialization on Page Load
    FB-->>API: onAuthStateChanged(user)
    API->>Ctx: mapFirebaseUser(user)
    Ctx->>Ctx: setUser(mappedUser), setLoading(false)
    
    alt User is Unauthenticated
        Guard->>User: Redirect to /login (preserve location.state.from)
        User->>Comp: Fill Credentials & Submit
        Comp->>Ctx: login({ email, password })
        Ctx->>API: loginWithEmail(credentials)
        API->>FB: signInWithEmailAndPassword(auth, email, password)
        FB-->>API: UserCredential
        API-->>Ctx: AuthUser
        Ctx-->>Comp: Promise resolves
        Comp->>User: Navigate to fromPath or /lotes
    else User is Authenticated
        Guard->>User: Render Protected Feature Route (or Outlet)
    end
```

---

## 2. Code Quality & Technical Debt Assessment

### 2.1 Critical Performance Bottlenecks

#### Monolithic Route Bundling in `App.tsx`
`src/App.tsx` imports heavy application modules synchronously:
```tsx
// Current src/App.tsx
import { NewBatchWizard, QuickRecognition, BatchDetail, BatchList, SuccessPage } from './features/batches';
import { RecognitionCatalog, CertificateDesigner } from './features/recognitions';
import { SummaryView } from './features/summary';
import { StatisticsDashboard } from './features/statistics';
import { LandingPage } from './features/landing';
```
When an unauthenticated visitor arrives at `https://app.chil/#/`, their browser downloads and evaluates `jspdf`, `jszip`, canvas rendering engines from `CertificateDesigner`, and `@tanstack/react-table`.
* **Impact:** Unnecessary bundle bloat (>2 MB JS payload on first load) for a public landing page.
* **Standard:** Adhere to Vercel Best Practice `bundle-dynamic-imports` and React 19 lazy route splitting.

#### Massive 1.3 MB Image Asset (`CHIL_LOGO.png`)
Checking asset file sizes:
```bash
-rw-------+ 1 root root 1.3M Nov  5 14:13 CHIL_LOGO.png
-rw-------+ 1 root root 7.6K Nov  5 14:13 WSCT_LOGO_EN_RGB_NEG.svg
```
`CHIL_LOGO.png` is **1.3 Megabytes**. It is loaded synchronously in `HeroSection.tsx`, `LoginPage.tsx`, `RegisterPage.tsx`, `LandingFooter.tsx`, and `Sidebar.tsx`. In Venezuelan scout environments where leaders often access the tool over restricted mobile 3G/4G bandwidth, this 1.3 MB download directly harms Largest Contentful Paint (LCP) and user retention.
* **Impact:** 1.3 MB PNG image blocks mobile rendering.
* **Solution:** Convert to WebP format (~35-45 KB) with lossy WebP compression or high-density SVG/optimized PNG fallback.

#### Unhoisted Inline Topographic Vector Cartography
`HeroSection.tsx` includes an inline 114-line SVG vector structure (`<defs>`, linear gradients, 10 `<ellipse>` elevation loops, 5 continuous cubic bezier `<path>`s, and elevation text). Because it is rendered directly inside `HeroSection`, it is re-evaluated and retained in React Virtual DOM memory on every render.
* **Standard:** Follow Vercel Best Practice `rendering-hoist-jsx` / `server-hoist-static-io`. Extract the static map into a memoized subcomponent (`TopographicContourMap.tsx`) or standalone SVG asset.

### 2.2 Security & Configuration Practices

#### Hardcoded Firebase Config
`src/lib/firebase.ts` hardcodes Firebase configuration:
```ts
const firebaseConfig = {
  apiKey: "AIzaSyCRhmtHPH-W7X1bvWKencfxv7-gOLB5XUE",
  authDomain: "chil-2d600.firebaseapp.com",
  projectId: "chil-2d600",
  storageBucket: "chil-2d600.firebasestorage.app",
  messagingSenderId: "941642326953",
  appId: "1:941642326953:web:3334d5987cb9579d0edab8",
  measurementId: "G-FZ56YEC843"
};
```
While Firebase client API keys are identifiers rather than secrets, hardcoding them prevents environment-specific switching (e.g., local Firebase emulators for offline development, staging vs. production Firestore).
* **Fix:** Transition to `import.meta.env.VITE_FIREBASE_*` variables with fallback defaults.

#### Registration Race Condition (`updateProfile` vs `onAuthStateChanged`)
In `src/features/auth/api/index.ts`:
```ts
export async function registerWithEmail(data: RegisterCredentials): Promise<AuthUser> {
  const userCredential = await createUserWithEmailAndPassword(auth, data.email.trim(), data.password);
  if (data.full_name) {
    await updateProfile(userCredential.user, { displayName: data.full_name.trim() });
  }
  const mapped = mapFirebaseUser(userCredential.user);
  return mapped;
}
```
In Firebase Auth, `createUserWithEmailAndPassword` immediately triggers the internal `onAuthStateChanged` callback with `displayName: null`. The subsequent `updateProfile` modifies the user, but does not trigger an `onAuthStateChanged` event. Consequently, any component relying exclusively on the listener receives `null` until a page refresh or explicit token reload occurs.
* **Fix:** In `AuthContext`, ensure registration completes both user creation and profile assignment before releasing loading/auth state.

#### Cross-Module Auth Coupling
In `src/features/batches/api/batchesCrud.ts`, `membersCrud.ts`, and `src/features/recognitions/api/index.ts`:
```ts
const targetUserId = params.user_id ?? userId ?? auth.currentUser?.uid ?? '';
```
API layer files bypass `AuthContext` and read directly from `auth.currentUser?.uid`. If the listener has not resolved or if the token is in the process of refreshing, operations fall back to an empty string (`''`), writing orphaned Firestore documents or triggering cryptic permission errors.

### 2.3 Form Architecture & UI Reusability

#### Inconsistent Form Library Usage
| Component | Form Library | Validation Mechanism | Input Component Used |
| :--- | :--- | :--- | :--- |
| `LoginPage.tsx` | `react-hook-form` | Zod (`zodResolver`) | Custom inlined HTML `<input>` |
| `RegisterPage.tsx` | `react-hook-form` | Zod (`zodResolver`) | Custom inlined HTML `<input>` with helper functions |
| `ForgotPasswordModal.tsx` | Raw `useState` | Zod manual `safeParse` | Reusable `Field` component (`src/components/Field.tsx`) |

* `src/components/Field.tsx` already exists in the project with full `forwardRef`, `label`, `variant="error"`, and `errorText` support.
* In `RegisterPage.tsx`, helper functions (`getFieldClassName`, `getLabelClassName`) duplicate styles that belong in a shared form input component.
* Password visibility toggle logic (`showPassword`, `Eye`, `EyeOff` icons) is duplicated across `LoginPage` and `RegisterPage`.
* **Fix:** Extract a reusable `PasswordInput` component or unify `Field` with password toggle support.

### 2.4 Accessibility (a11y) & Semantic Structure

1. **Missing Accessible Labels on Landing Sections:**
   - `FeatureGridSection.tsx`: `<section id="capacidades">` lacks `aria-labelledby` referencing its heading `<h2>Todo lo necesario...</h2>`.
   - `WorkflowSection.tsx`: `<section>` has no accessible title or `aria-label`.
2. **Dialog Focus Management (`Modal.tsx` / `ForgotPasswordModal.tsx`):**
   - When `ForgotPasswordModal` opens, focus is not trapped within the `<dialog>` element. Screen reader and keyboard navigation can cycle behind the backdrop.
   - On close, focus does not return to the trigger button (`"¿Olvidaste tu contraseña?"`).
3. **WAI-ARIA Menu Navigation in `UserProfileMenu.tsx`:**
   - Dropdown correctly sets `aria-expanded`, `aria-haspopup`, and `role="menu"`.
   - However, it only supports closing on `Escape`. It lacks `ArrowDown` / `ArrowUp` item navigation and focus trapping per the WAI-ARIA Menu Button pattern.
4. **Form Input Error Linking:**
   - Input errors are displayed as `<p className="text-red-500">`, but inputs lack `aria-invalid="true"` and `aria-describedby="[field]-error"`.

---

## 3. Test Coverage & Resilience Analysis

### 3.1 Existing Test Suite Inventory

```
src/features/auth/
├── api/__tests__/authApi.test.ts                     [8 test cases - 100% passing]
├── context/__tests__/AuthContext.test.tsx             [3 test cases - 100% passing]
└── components/__tests__/
    ├── ForgotPasswordModal.test.tsx                 [5 test cases - 100% passing]
    ├── LoginPage.test.tsx                           [7 test cases - 100% passing]
    ├── ProtectedRoute.test.tsx                      [3 test cases - 100% passing]
    ├── RegisterPage.test.tsx                        [6 test cases - 100% passing]
    └── UserProfileMenu.test.tsx                     [4 test cases - 100% passing]

src/features/landing/
└── components/__tests__/LandingPage.test.tsx        [7 test suites, 8 test cases - 100% passing]
```

### 3.2 Testing Gaps & Edge Cases

| Area | Component | Missing Test Scenario | Severity |
| :--- | :--- | :--- | :--- |
| **Routing** | `ProtectedRoute.tsx` | **Outlet Mode:** `ProtectedRoute` contains `children ? <>{children}</> : <Outlet />`. The `<Outlet />` branch (used when configuring layout routes) is completely untested. | **High** |
| **Auth API** | `authApi.ts` | **Current User Resolution:** `getCurrentUser()` is only tested for the `null` branch; the active user branch (`auth.currentUser !== null`) is omitted. | **Medium** |
| **Auth API** | `authApi.ts` | **Registration without Full Name:** `registerWithEmail` without `full_name` (optional field) branch is untested. | **Low** |
| **User Menu** | `UserProfileMenu.tsx` | **Click Outside Closing:** Event listener for `mousedown` outside `dropdownRef` is untested. | **Medium** |
| **User Menu** | `UserProfileMenu.tsx` | **Collapsed Sidebar Mode:** Visual rendering when `isCollapsed={true}` is untested. | **Medium** |
| **User Menu** | `UserProfileMenu.tsx` | **PhotoURL Branch:** Rendering user image when `user.photoURL` is present (vs fallback initials) is untested. | **Low** |
| **Forms** | `LoginPage.tsx` / `RegisterPage.tsx` | **Async Submitting State:** Form disabling during active network request (`isSubmitting === true`) is not asserted. | **Medium** |
| **Landing** | `LandingPage.test.tsx` | **CTA & Navigation Links:** No user interaction testing (clicking "Comenzar Ahora", anchor scrolling to `#capacidades`). | **Low** |
| **Session** | `AuthContext.tsx` | **Session Expiration / Revocation:** Behavior when Firebase token is revoked or session expires mid-operation is untested. | **High** |

---

## 4. Prioritized Refactoring Proposals (P0, P1, P2)

### Summary Matrix

| ID | Priority | Proposal | Target Files | Impact | Complexity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **P0.1** | **P0** | Route-level code splitting & lazy loading | `src/App.tsx` | Critical (LCP / Bundle Size) | Medium |
| **P0.2** | **P0** | Optimize 1.3 MB logo asset to WebP | `src/assets/`, `HeroSection.tsx`, `LoginPage.tsx` | Critical (LCP / Network) | Low |
| **P0.3** | **P0** | Extract Firebase config to environment variables | `src/lib/firebase.ts`, `.env.example` | High (Security / Dev Experience) | Low |
| **P0.4** | **P0** | Resolve registration display name race condition | `src/features/auth/api/index.ts`, `AuthContext.tsx` | High (Data Integrity / UX) | Medium |
| **P1.1** | **P1** | Refactor to React Router v7 Layout Routes | `src/App.tsx`, `src/layouts/MainLayout.tsx` | High (Architectural Cleanliness) | Medium |
| **P1.2** | **P1** | Unify form architecture with reusable `PasswordInput` | `src/features/auth/components/`, `src/components/Field.tsx` | Medium (DRY / Maintainability) | Medium |
| **P1.3** | **P1** | Hoist static SVG vector cartography | `src/features/landing/components/HeroSection.tsx` | Medium (Re-render Efficiency) | Low |
| **P1.4** | **P1** | Comprehensive WAI-ARIA & a11y hardening | `UserProfileMenu.tsx`, `FeatureGridSection.tsx`, `Modal.tsx` | Medium (Accessibility Compliance) | Medium |
| **P2.1** | **P2** | Add `onIdTokenChanged` & session revocation handling | `src/features/auth/api/index.ts`, `AuthContext.tsx` | Medium (Enterprise Resilience) | Medium |
| **P2.2** | **P2** | Fill testing gaps (`Outlet`, click-outside, photoURL) | `src/features/auth/**/__tests__/` | Medium (Test Coverage to >95%) | Low |
| **P2.3** | **P2** | Secure scraper credentials storage | `src/features/batches/api/scraperApi.ts`, `Sidebar.tsx` | High (Cross-module Security) | Medium |

---

### Detailed Refactoring Specifications

#### [P0.1] Route-Level Code Splitting & Lazy Loading (`src/App.tsx`)
* **Problem:** `App.tsx` bundles heavy dependencies (`jspdf`, `jszip`, `@tanstack/react-table`, `CertificateDesigner`) into the initial bundle loaded by landing and login page visitors.
* **Solution:** Introduce `React.lazy()` for all authenticated feature views, wrapped with a shared `<Suspense fallback={<RouteLoadingSpinner />}>`.
* **Proposed Implementation Pattern:**
```tsx
import React, { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, LoginPage, RegisterPage, ProtectedRoute, useAuth } from './features/auth';
import { LandingPage } from './features/landing';
import { MainLayout } from './layouts/MainLayout';

// Lazily loaded authenticated feature modules
const BatchList = lazy(() => import('./features/batches').then(m => ({ default: m.BatchList })));
const NewBatchWizard = lazy(() => import('./features/batches').then(m => ({ default: m.NewBatchWizard })));
const QuickRecognition = lazy(() => import('./features/batches').then(m => ({ default: m.QuickRecognition })));
const BatchDetail = lazy(() => import('./features/batches').then(m => ({ default: m.BatchDetail })));
const SuccessPage = lazy(() => import('./features/batches').then(m => ({ default: m.SuccessPage })));
const RecognitionCatalog = lazy(() => import('./features/recognitions').then(m => ({ default: m.RecognitionCatalog })));
const CertificateDesigner = lazy(() => import('./features/recognitions').then(m => ({ default: m.CertificateDesigner })));
const SummaryView = lazy(() => import('./features/summary').then(m => ({ default: m.SummaryView })));
const StatisticsDashboard = lazy(() => import('./features/statistics').then(m => ({ default: m.StatisticsDashboard })));

const RouteLoadingSpinner: React.FC = () => (
  <output className="min-h-[50vh] flex flex-col items-center justify-center space-y-3" aria-live="polite">
    <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
    <span className="text-xs font-semibold text-neutral/60">Cargando módulo...</span>
  </output>
);
```

#### [P0.2] Optimize 1.3 MB Brand Logo Asset to WebP (`src/assets/`)
* **Problem:** `CHIL_LOGO.png` is 1.3 MB. It renders as an 112px image on desktop and 96px on mobile, downloading ~30x more bytes than necessary.
* **Solution:**
  1. Generate `src/assets/CHIL_LOGO.webp` (target size: ~35 KB, 512x512 resolution with transparent background).
  2. Maintain `CHIL_LOGO.png` optimized (~60 KB) for fallback.
  3. Add `loading="eager"` and explicit `width` / `height` dimensions to prevent Cumulative Layout Shift (CLS).

#### [P0.3] Extract Firebase Config to Environment Variables (`src/lib/firebase.ts`)
* **Problem:** Project IDs and API keys hardcoded in version control.
* **Solution:**
```ts
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCRhmtHPH-W7X1bvWKencfxv7-gOLB5XUE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "chil-2d600.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "chil-2d600",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "chil-2d600.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "941642326953",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:941642326953:web:3334d5987cb9579d0edab8",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-FZ56YEC843"
};
```

#### [P0.4] Resolve Registration Display Name Race Condition
* **Problem:** `createUserWithEmailAndPassword` fires `onAuthStateChanged` before `updateProfile` completes.
* **Solution:**
  1. In `registerWithEmail`: update profile immediately upon user credential receipt and explicitly invoke `await userCredential.user.reload()`.
  2. In `AuthContext.tsx`: wrap registration in an atomic dispatch that avoids relying on asynchronous listener latency to populate `displayName`.
```ts
// src/features/auth/api/index.ts
export async function registerWithEmail(data: RegisterCredentials): Promise<AuthUser> {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.email.trim(),
      data.password
    );
    if (data.full_name?.trim()) {
      await updateProfile(userCredential.user, {
        displayName: data.full_name.trim()
      });
      // Force reload to guarantee currentUser properties sync
      await userCredential.user.reload();
    }
    const mapped = mapFirebaseUser(auth.currentUser ?? userCredential.user);
    if (!mapped) throw new Error('Error al inicializar los datos del usuario.');
    return mapped;
  } catch (error) {
    throw new Error(mapAuthError(error), { cause: error });
  }
}
```

#### [P1.1] Refactor to React Router v7 Layout Routes
* **Problem:** Repeating `<ProtectedRoute>` 9 times in `App.tsx`, and inspecting `location.pathname === '/' || location.pathname === '/inicio'` inside `MainLayout.tsx`.
* **Solution:** Use layout routes with `<Outlet />`. Separate public shell (`PublicLayout`) from workspace shell (`AppLayout` with `Sidebar`).
```tsx
// Proposed App.tsx Routing Structure
<AuthProvider>
  <HashRouter>
    <Routes>
      {/* Public Pages Layout */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<RootRoute />} />
        <Route path="/inicio" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
      </Route>

      {/* Protected Application Layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/lotes" element={<BatchList />} />
          <Route path="/lotes/nuevo" element={<NewBatchWizard />} />
          <Route path="/lotes/rapido" element={<QuickRecognition />} />
          <Route path="/emision-rapida" element={<QuickRecognition />} />
          <Route path="/lotes/:id" element={<BatchDetail />} />
          <Route path="/lotes/exito" element={<SuccessPage />} />
          <Route path="/reconocimientos" element={<RecognitionCatalog />} />
          <Route path="/reconocimientos/:id/plantilla" element={<CertificateDesigner />} />
          <Route path="/resumen" element={<SummaryView />} />
          <Route path="/estadisticas" element={<StatisticsDashboard />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/lotes" replace />} />
    </Routes>
  </HashRouter>
</AuthProvider>
```

#### [P1.2] Unify Form Architecture & Create Reusable `PasswordInput`
* **Problem:** Duplicated toggle button markup, duplicated `Eye`/`EyeOff` icons, duplicated classes, and non-conforming `ForgotPasswordModal`.
* **Solution:**
  1. Refactor `ForgotPasswordModal` to use `react-hook-form` + `zodResolver(forgotPasswordSchema)`.
  2. Create `src/components/PasswordInput.tsx` (or integrate password toggle mode into `src/components/Field.tsx`).
  3. Wire `aria-invalid={Boolean(errors.password)}` and `aria-describedby="password-error"`.

#### [P1.3] Hoist Static Topographic SVG Cartography
* **Problem:** 114 lines of static SVG nodes re-evaluated on every hero render.
* **Solution:** Extract into `src/features/landing/components/TopographicContourMap.tsx` wrapped in `React.memo()`, or compile as a standalone SVG asset referenced via `<img aria-hidden="true" src={topoMapSvg} />`.

#### [P1.4] Accessibility (a11y) Conformance
* Add `aria-labelledby="capacidades-heading"` to `FeatureGridSection`.
* Add `aria-labelledby="workflow-heading"` to `WorkflowSection`.
* Enhance `UserProfileMenu`:
  - Support `ArrowDown` to open dropdown and focus first item.
  - Support `ArrowUp`/`ArrowDown` to cycle menu items.
  - Return focus to trigger button upon close.
* Trap focus inside `Modal` when opened (`dialog.showModal()` or focus-trap wrapper).

---

## 5. Risk Assessment & Verification Strategy

### 5.1 Risk Matrix

| Risk Scenario | Probability | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Lazy loading flashes or route waterfalls** | Medium | Low | Provide smooth spinner in `<Suspense fallback={<RouteLoadingSpinner />}>` styled to match Chil brand palette. |
| **HashRouter redirect desynchronization** | Low | High | Ensure all `Navigate` components retain `replace` flag and pass `state: { from: location }`. |
| **Image asset path breakage during build** | Low | High | Validate Vite asset import syntax (`import logoWebp from '../assets/CHIL_LOGO.webp'`) with build smoke tests. |
| **Firebase Auth token expiration during long sessions** | Medium | Medium | Register `onIdTokenChanged` listener to handle background token refresh seamlessly. |
| **Accessibility regression on mobile keyboard dismiss** | Low | Low | Keep inputs cleanly unbound from window resize side-effects. |

### 5.2 Verification Checklist & Test Plan

1. **Bundle & Performance Verification:**
   - Execute `npm run build` and inspect chunk distribution in `dist/assets/`.
   - Confirm public entry chunk is `< 150 KB` gzipped.
   - Verify `CHIL_LOGO.webp` is loaded on landing page with status `200` and size `< 50 KB`.
2. **Authentication Flow Verification:**
   - Test sign up with new credentials; verify `displayName` displays immediately in `UserProfileMenu` without page refresh.
   - Test sign in with valid and invalid credentials; verify Spanish error messages display accurately.
   - Test password reset modal: verify validation, submission, and confirmation dialog.
   - Test sign out: verify redirection to `/login` and complete cleanup of `user` state.
3. **Route Guard & Layout Verification:**
   - Direct navigation to guarded route (`#/lotes`) while logged out must redirect to `#/login` with `location.state.from` set.
   - After authenticating, user must be redirected back to the originally requested route.
   - Verify public pages (`/`, `/inicio`, `/login`, `/registro`) display without sidebar.
   - Verify authenticated pages display responsive sidebar and mobile drawer.
4. **Automated Unit & Regression Suite:**
   - Run Vitest suite:
     ```bash
     npm test -- src/features/auth src/features/landing
     ```
   - Target test coverage: **>95% statement coverage** across `features/auth` and `features/landing`.
