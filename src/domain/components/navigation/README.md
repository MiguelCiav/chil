# App-Shell Navigation (`src/domain/components/navigation/`)

## Overview

App-shell navigation rail/mobile drawer (`Sidebar`) and Impeesa scraper connection settings dialog (`ScraperSettingsModal`), isolated from `src/components/` so UI primitives remain decoupled from routing, Firebase Auth state, and scraper backend calls.

## Interface

- `index.ts: *` (re-exports `./Sidebar` and `./ScraperSettingsModal`)
- `Sidebar.tsx:Sidebar`, `Sidebar.tsx:SidebarProps` (`isMobileOpen?`, `onMobileClose?`, `isCollapsed?`, `onToggleCollapse?`, `onSyncData?`)
- `ScraperSettingsModal.tsx:ScraperSettingsModal`

## Invariants

- `Sidebar.tsx:Sidebar`: Renders authenticated links (`/lotes`, `/lotes/nuevo`, `/reconocimientos`, `/resumen`, `/estadisticas`) + `Sincronizar datos` action (clearing RAM session caches, IndexedDB persistent cache, and cached scraper status before reloading) + `Ajustes Scraper` trigger (with emerald indicator dot when `sessionStatus?.status === 'active'`) + `UserProfileMenu` when signed in, or `/login` and `/registro` buttons when signed out; persists internal collapse state in `localStorage` under `chil_sidebar_collapsed`; renders mobile navigation inside `<div role="dialog" aria-modal="true">` with `Escape`-key handling, `Tab`/`Shift+Tab` focus trapping, and focus restoration on close.
- `ScraperSettingsModal.tsx:ScraperSettingsModal`: Reads `useScraperSettings()`, resets form/feedback messages when `isOpen` changes, validates non-empty email + password client-side, renders `ErrorAlert variant="compact"` on validation or API error, disables actions while saving or disconnecting, and renders active/expired/none Impeesa session banners explaining passwordless server-encrypted (`AES-256-GCM`) cookie persistence.

## Side Effects

- `Sidebar.tsx:Sidebar`: Reads/writes `window.localStorage` (`chil_sidebar_collapsed`), registers `document` `keydown` listeners when `isMobileOpen` is `true`, and calls `openModal()` from `ScraperSettingsContext`.
- `ScraperSettingsModal.tsx:ScraperSettingsModal`: Calls `saveScraperSession` and `clearScraperSession` (`src/features/batches/api`) and updates `setSessionStatus` in `ScraperSettingsContext`.

## Verification

- Run: `npm test -- --run`
