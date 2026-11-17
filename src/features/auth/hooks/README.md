# Auth Hooks

## Overview
Provides the `useAuth` custom hook to read `AuthContext` with an enforced provider boundary check.

## Interface
- `useAuth.ts:useAuth`: Hook `() => AuthContextType` returning the active `AuthContext` value.

## Invariants
- `useAuth.ts:useAuth`: Requires `AuthContext` to be truthy (must be called within an `AuthProvider`).

## Side Effects
- `useAuth.ts:useAuth`: Throws `new Error('useAuth must be used within an AuthProvider')` when context is falsy.

## Verification
- Run: `npm test -- --run`
