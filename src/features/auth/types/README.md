# Auth Types

## Overview
Defines Zod validation schemas, inferred credential/parameter types, and TypeScript interfaces (`AuthUser`, `AuthContextType`) for the `auth` feature.

## Interface
- `index.ts:EMAIL_REGEX`: Regular expression `/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/` validating email format.
- `index.ts:loginSchema`: Zod schema validating `{ email, password }`.
- `index.ts:LoginCredentials`: Type inferred from `loginSchema`.
- `index.ts:registerSchema`: Zod schema validating `{ full_name, email, password, confirm_password }`.
- `index.ts:RegisterCredentials`: Type inferred from `registerSchema`.
- `index.ts:forgotPasswordSchema`: Zod schema validating `{ email }`.
- `index.ts:ForgotPasswordParams`: Type inferred from `forgotPasswordSchema`.
- `index.ts:AuthUser`: Interface `{ uid: string; email: string | null; displayName: string | null; photoURL?: string | null }`.
- `index.ts:AuthContextType`: Interface `{ user: AuthUser | null; loading: boolean; login: (data: LoginCredentials) => Promise<void>; register: (data: RegisterCredentials) => Promise<void>; logout: () => Promise<void>; resetPassword: (email: string) => Promise<void> }`.

## Invariants
- `index.ts:EMAIL_REGEX`: Enforces `/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/`.
- `index.ts:loginSchema`: Trims `email`, requires non-empty string matching `EMAIL_REGEX`, and requires `password` of at least `6` characters.
- `index.ts:registerSchema`: Trims `full_name` (`2` to `100` characters), trims `email` (non-empty, matches `EMAIL_REGEX`), requires `password` >= `6` characters, requires non-empty `confirm_password`, and refines `data.password === data.confirm_password` on path `['confirm_password']`.
- `index.ts:forgotPasswordSchema`: Trims `email` and requires non-empty string matching `EMAIL_REGEX`.

## Side Effects
- None.

## Verification
- Run: `npm test -- --run`
