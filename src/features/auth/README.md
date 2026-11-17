# Auth Feature Blueprint

## System Overview
The `auth` feature subsystem manages Firebase Authentication and session state for Chil: email/password sign-in, account registration with profile name initialization, password recovery emails, global React auth context (`AuthProvider` / `useAuth`), route guarding (`ProtectedRoute`), and the user profile menu (`UserProfileMenu`).

## Local Interface & Invariants
- **Public Barrel (`index.ts`)**:
  - `index.ts:*` re-exports `./types`, `./api`, `./context/AuthContext`, `./hooks/useAuth`, `./components/LoginPage`, `./components/RegisterPage`, `./components/ForgotPasswordModal`, `./components/ProtectedRoute`, and `./components/UserProfileMenu`.
  - **Invariants**: None (pure barrel re-export module).
  - **Side Effects**: None.

## Subdirectories & System Boundaries
- **API**: [`./api/README.md`](./api/README.md) — Firebase Auth SDK wrappers (`loginWithEmail`, `registerWithEmail`, `logoutUser`, `resetPasswordEmail`, `getCurrentUser`, `onAuthStateChangedListener`), `AuthUser` mapping, and Spanish error code mapping.
- **Components**: [`./components/README.md`](./components/README.md) — `LoginPage`, `RegisterPage`, `ForgotPasswordModal`, `ProtectedRoute`, and `UserProfileMenu`.
- **Context**: [`./context/README.md`](./context/README.md) — `AuthContext` and `AuthProvider` subscribing to Firebase auth state and exposing memoized auth actions.
- **Hooks**: [`./hooks/README.md`](./hooks/README.md) — `useAuth` consumer hook enforcing `AuthProvider` boundary.
- **Types**: [`./types/README.md`](./types/README.md) — `EMAIL_REGEX`, Zod schemas (`loginSchema`, `registerSchema`, `forgotPasswordSchema`), and `AuthUser` / `AuthContextType` interfaces.

## Global Invariants
- **Provider & Route Boundary**: `hooks/useAuth.ts:useAuth` throws if invoked outside `AuthProvider`; `components/ProtectedRoute.tsx:ProtectedRoute` renders a loading spinner while `loading` is `true` and redirects unauthenticated users (`!loading && !user`) to `/login` preserving `location.state.from`.
- **Credential Validation & Trimming**: `types/index.ts` enforces `EMAIL_REGEX` and minimum 6-character passwords across `loginSchema`, `registerSchema` (plus 2–100 char `full_name` and matching `confirm_password`), and `forgotPasswordSchema`; `api/index.ts` trims `email` and `full_name` before Firebase calls and maps Firebase error codes to Spanish messages via `mapAuthError`.

## Global Side Effects
- **Firebase Authentication**: Calls `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `updateProfile`, `signOut`, `sendPasswordResetEmail`, `auth.currentUser`, and `onAuthStateChanged` via `src/lib/firebase.ts`.
- **Browser & Navigation**: Manages React Router redirects/navigation (`/login`, `/registro`, `/lotes`), `document` `'mousedown'` / `'keydown'` listeners (`UserProfileMenu`), and `console.error` logging on logout failure.

## System Verification
- Run: `npm test -- --run`
