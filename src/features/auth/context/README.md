# Auth Context

## Overview
Defines `AuthContext` and `AuthProvider`, managing React `user` and `loading` state via Firebase auth state subscription and exposing memoized `login`, `register`, `logout`, and `resetPassword` callbacks.

## Interface
- `AuthContext.tsx:AuthContext`: React context holding `AuthContextType | undefined`.
- `AuthContext.tsx:AuthProvider`: `React.FC<{ children: React.ReactNode }>` providing auth state and actions to descendants.

## Invariants
- `AuthContext.tsx:AuthContext`: Initialized with default value `undefined` outside `AuthProvider`.
- `AuthContext.tsx:AuthProvider`: Initializes `user` as `null` and `loading` as `true`, setting `loading` to `false` when `onAuthStateChangedListener` invokes its callback; memoizes `login`, `register`, `logout`, `resetPassword` with `useCallback` and the context value object with `useMemo`.

## Side Effects
- `AuthContext.tsx:AuthProvider`: Subscribes via `onAuthStateChangedListener` in `useEffect` on mount and calls `unsubscribe()` on cleanup; invokes `loginWithEmail`, `registerWithEmail`, `logoutUser`, and `resetPasswordEmail` (which perform Firebase Auth calls and may throw), and updates React `user` state in `login`, `register`, and `logout`.

## Verification
- Run: `npm test -- --run`
