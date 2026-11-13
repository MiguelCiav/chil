# AGENTS.md

Operational instructions for coding agents working in **Chil** (Scout recognition batch-management SPA with Firebase + Vercel scraper backends).

## 1. Architecture & Repository Map
- **Frontend (`src/`)**: React 19, TypeScript, Vite, Tailwind CSS 4, `HashRouter`, `react-hook-form` + `zod`, `@tanstack/react-table`, `jspdf`, `jszip`.
- **App Shell (`src/App.tsx`)**: Composes `AuthProvider` -> `ScraperSettingsProvider` -> `HashRouter` -> `MainLayout` + shared `ScraperSettingsModal`.
- **Shared Client Layers**:
  - `src/lib/firebase.ts` — Firebase Auth, Firestore, and Functions client setup.
  - `src/context/ScraperSettingsContext.tsx` — Shared scraper login and active session provider.
  - `src/components/` — Reusable UI primitives only; keep feature/domain logic out of here.
- **Features (`src/features/`)**:
  - `auth/`, `batches/`, `landing/`, `recognitions/`, `statistics/`, `summary/`
  - Keep `api/`, `hooks/`, `components/`, `types/`, `utils/` cleanly separated inside each feature.
- **Backends**:
  - `functions/` — Firebase Cloud Functions (Node 22 CommonJS: `index.js`, `handlers/`, `scraper/`, `__tests__/`).
  - `scraper-api/` — Standalone Vercel serverless mirror (`api/`, `lib/`, `__tests__/`).

## 2. Dual-Backend Scraper Parity (Critical)
Both `functions/` and `scraper-api/` expose the same four endpoints: `saveScraperSession`, `getScraperSessionStatus`, `clearScraperSession`, and `getMemberStatus`.
- **Transport routing**: `src/features/batches/api/scraperApi.ts` (`getScraperApiUrl()`) calls `scraper-api/` over HTTP when `VITE_SCRAPER_API_URL` is set, and falls back to Firebase Callables otherwise.
- **Mirror backend edits**: Changes to Impeesa scraping (`lookup.js` fields such as `region`, `distrito`, `grupo`, `unidad`), auth/cookie handling (`auth.js`, `cookieHelper.js`), or response/error contracts **must** be applied to both `functions/` and `scraper-api/` with tests.
- **Single error mapping**: Preserve structured error codes (`unauthenticated`, `session-expired`, `failed-precondition`) once in `scraperApi.ts` across both transports without double-wrapping HTTP errors.
- **Rollback plan**: Check `docs/ROLLBACK_FIREBASE_FUNCTIONS.md` before retiring `scraper-api/` or altering transport selection.

## 3. Security, Firestore & Environment Rules
- **Locked session docs**: `firestore.rules` sets `allow read, write: if false;` on `/scraper_sessions/{uid}`—never read or write `scraper_sessions` from client SDK code.
- **Server encryption**: Only Admin SDK code in `functions/` and `scraper-api/` accesses `scraper_sessions/{uid}`, using `AES-256-GCM` via `SCRAPER_ENCRYPTION_KEY`.
- **Open Firestore collections**: `batches`, `scout_members`, `regions`, `districts`, `groups`, and `recognition_types` allow open read/write in `firestore.rules`—validate writes carefully in client/service code.
- **Secrets hygiene**: Never commit or expose `.env`, `.env.production`, `scraper-api/.env.local`, or `.vercel/` files.

## 4. Commands, Build & Verification Traps
Run the quality pipeline from the **repository root** before finishing:

```bash
npm run lint
npm run build
npm test -- --run
```

- **Avoid watch mode**: `npm test` runs Vitest in interactive watch mode; always pass `-- --run`.
- **Unified test suite**: `vite.config.ts` runs Vitest (`jsdom`, 30s timeout) across `src/`, `functions/__tests__/`, and `scraper-api/__tests__/` (excluding `functions/node_modules/**`).
- **Vercel `scraper-api/` trap**: `scraper-api/package.json` intentionally defines **no `build` or `test` script**. Do not run `npm run build` in `scraper-api/`, and leave Vercel's Build Command empty when Root Directory is `scraper-api`.
- **Lint & TypeScript blind spots**:
  - `eslint.config.js` checks `**/*.{ts,tsx}` only (ignoring `dist`, `src-tauri`, `coverage`); intentionally unused identifiers must be prefixed with `_`.
  - `tsc` (`npm run build`) does not typecheck CommonJS `.js` files in `functions/` or `scraper-api/`—always verify backend `.js` edits with Vitest unit tests.
- **Additional scripts**:
  - `npm run dev` — Vite dev server pinned to port `1420` (`strictPort: true` in `vite.config.ts`).
  - `npx vitest run --coverage` — Coverage for `src/**/*.{ts,tsx}` and `functions/**/*.js`.
  - `npm run seed-hierarchy` — Runs `scripts/seed-hierarchy.mjs`.
  - `npm --prefix functions run serve` — Starts `firebase emulators:start --only functions`.

## 5. UI & Code Conventions
- Keep changes strictly scoped to the target feature and preserve existing comments/docstrings unrelated to your diff.
- All user-facing labels, validation messages, modals, and errors are in **Spanish**—keep new UI copy and error banners consistent in Spanish.

## 6. Documentation & Project Skills
- **Design & Blueprints**: Check `docs/designs/SITEMAP.md` and `src/features/batches/README.md` (plus `api/`, `components/`, `hooks/`, `types/`, `utils/` `README.md` maps) before modifying batch wizard, detail, or quick-recognition flows.
- **Keep docs synced**: When changing public hooks, API signatures, or scraper contracts, update the affected `README.md` maps or design docs (audit drift with `/egm:egm-drift-report`).
- **Skills (`.agent/skills/`)**:
  - `chil-elephant/SKILL.md` — Elephant planning, architecture review, and quality guardrails.
  - `composition-patterns/SKILL.md` — Scalable React component composition patterns.
  - `react-best-practices/SKILL.md` — React rendering and bundle optimization rules.
