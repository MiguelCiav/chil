# Auth API

## Overview
Wraps Firebase Authentication operations (email/password login, registration with optional `displayName` update, logout, password reset, current user lookup, and auth state subscription) and maps Firebase `User` objects and error codes into `AuthUser` and Spanish error messages.

## Interface
- `index.ts:mapFirebaseUser`: Pure function `(user: User | null) => AuthUser | null` mapping Firebase `User` fields into `AuthUser`.
- `index.ts:mapAuthError`: Pure function `(error: unknown) => string` mapping Firebase auth error codes to Spanish messages.
- `index.ts:loginWithEmail`: Async function `(credentials: LoginCredentials) => Promise<AuthUser>` signing in via email and password.
- `index.ts:registerWithEmail`: Async function `(data: RegisterCredentials) => Promise<AuthUser>` creating a user account and updating profile name.
- `index.ts:logoutUser`: Async function `() => Promise<void>` signing out the current user.
- `index.ts:resetPasswordEmail`: Async function `(email: string) => Promise<void>` sending a password reset email.
- `index.ts:getCurrentUser`: Function `() => AuthUser | null` returning the currently authenticated user.
- `index.ts:onAuthStateChangedListener`: Function `(callback: (user: AuthUser | null) => void) => () => void` subscribing to auth state changes.

## Invariants
- `index.ts:mapFirebaseUser`: Returns `null` when `user` is `null`/falsy; otherwise maps `uid`, `email`, `displayName`, and `photoURL` into `AuthUser`.
- `index.ts:mapAuthError`: Returns `'Ha ocurrido un error inesperado.'` when `error` is falsy; maps Firebase auth codes (`auth/user-not-found`, `auth/wrong-password`, `auth/invalid-credential`, `auth/email-already-in-use`, `auth/weak-password`, `auth/invalid-email`, `auth/too-many-requests`, `auth/network-request-failed`, `auth/user-disabled`) to Spanish strings, falling back to `error.message` or `'Ha ocurrido un error al procesar su solicitud.'`.
- `index.ts:loginWithEmail`: Trims `credentials.email` before calling `signInWithEmailAndPassword` and requires `mapFirebaseUser(userCredential.user)` to be non-null.
- `index.ts:registerWithEmail`: Trims `data.email` before calling `createUserWithEmailAndPassword`, updates `displayName` (trimmed) only when `data.full_name` is truthy, and requires `mapFirebaseUser(userCredential.user)` to be non-null.
- `index.ts:resetPasswordEmail`: Trims `email` before calling `sendPasswordResetEmail`.

## Side Effects
- `index.ts:loginWithEmail`: Calls Firebase `signInWithEmailAndPassword(auth, ...)`; throws `new Error('Error al obtener los datos de la sesión.')` if the mapped user is `null`, and catches/rethrows `new Error(mapAuthError(error), { cause: error })`.
- `index.ts:registerWithEmail`: Calls Firebase `createUserWithEmailAndPassword(auth, ...)` and conditionally `updateProfile(userCredential.user, ...)`; throws `new Error('Error al inicializar los datos del usuario.')` if the mapped user is `null`, and catches/rethrows `new Error(mapAuthError(error), { cause: error })`.
- `index.ts:logoutUser`: Calls Firebase `signOut(auth)` and catches/rethrows `new Error(mapAuthError(error), { cause: error })`.
- `index.ts:resetPasswordEmail`: Calls Firebase `sendPasswordResetEmail(auth, ...)` and catches/rethrows `new Error(mapAuthError(error), { cause: error })`.
- `index.ts:getCurrentUser`: Reads `auth.currentUser`.
- `index.ts:onAuthStateChangedListener`: Subscribes to Firebase `onAuthStateChanged(auth, ...)` and invokes `callback(mapFirebaseUser(user))`.

## Verification
- Run: `npm test -- --run`
