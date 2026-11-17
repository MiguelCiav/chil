# Auth Components

## Overview
Authentication UI components implementing login, registration, password reset modal, route protection, and the authenticated user profile dropdown menu, integrated with `useAuth`, `react-hook-form` + Zod schemas, and `react-router-dom`.

## Interface
- `ForgotPasswordModal.tsx:ForgotPasswordModal`: `React.FC` rendering the password recovery modal.
- `LoginPage.tsx:LoginPage`: `React.FC` rendering the sign-in page.
- `ProtectedRoute.tsx:ProtectedRoute`: `React.FC` guarding authenticated routes.
- `RegisterPage.tsx:RegisterPage`: `React.FC` rendering the account registration page.
- `UserProfileMenu.tsx:UserProfileMenuProps`: Props interface `{ isCollapsed?: boolean }` for `UserProfileMenu`.
- `UserProfileMenu.tsx:UserProfileMenu`: `React.FC<UserProfileMenuProps>` rendering the user avatar/initials trigger and logout dropdown.

## Invariants
- `ForgotPasswordModal.tsx:ForgotPasswordModal`: Conditionally renders internal `ForgotPasswordForm` only when `isOpen` is `true` so modal state (`email`, `loading`, `error`, `success`) resets on close/reopen; validates `{ email }` with `forgotPasswordSchema.safeParse({ email })` on submit (`noValidate` form), falling back to `'Correo inválido'` if no issue message is present; disables email `Field` and Cancel/Cerrar `Button` while `loading` is `true`; disables submit `Button` when `loading || !email.trim()` and hides submit `Button` when `success` is `true`.
- `LoginPage.tsx:LoginPage`: Uses `react-hook-form` with `zodResolver(loginSchema)` and `defaultValues: { email: '', password: '' }` (`noValidate` form); redirects authenticated users (`if (user)`) via `<Navigate to={from} replace />` where `from` is `location.state?.from?.pathname || '/lotes'`; disables email input, password input, and submit `Button` while `isSubmitting` is `true`; toggles password input `type` between `'password'` and `'text'` via `showPassword` state (`aria-label` `'Ocultar contraseña'` / `'Ver contraseña'`); links to `/registro` and passes `currentEmail || ''` as `defaultEmail` to `ForgotPasswordModal`.
- `ProtectedRoute.tsx:ProtectedRoute`: Renders loading `<output>` spinner (`aria-live="polite"`, `aria-label="Cargando sesión"`) while `loading` is `true`; redirects unauthenticated users (`!loading && !user`) to `/login` with `state={{ from: location }}` and `replace`; renders `children` if provided or `<Outlet />` otherwise.
- `RegisterPage.tsx:RegisterPage`: Uses `react-hook-form` with `zodResolver(registerSchema)` and `defaultValues: { full_name: '', email: '', password: '', confirm_password: '' }` (`noValidate` form); redirects authenticated users (`if (user)`) via `<Navigate to="/lotes" replace />`; disables `full_name`, `email`, `password`, `confirm_password` inputs and submit `Button` while `isSubmitting` is `true`; independently toggles `password` and `confirm_password` input `type` via `showPassword` and `showConfirmPassword`; links to `/login`.
- `UserProfileMenu.tsx:UserProfileMenu`: Returns `null` when `!user`; computes initials via `getInitials(user.displayName, user.email)` (first and last word initials for >= 2 whitespace-separated parts, first 2 chars for 1 part, first 2 chars of `email` if no `name`, or `'US'` fallback); falls back `displayName` to `'Usuario Scout'` and `email` to `''`; renders `user.photoURL` `<img>` when present or initials badge otherwise; hides name/chevron when `isCollapsed` is `true`; closes dropdown on outside `mousedown` or `'Escape'` `keydown` only when `isOpen` is `true`.

## Side Effects
- `ForgotPasswordModal.tsx:ForgotPasswordModal`: Calls `useAuth().resetPassword(email)` on valid submission.
- `LoginPage.tsx:LoginPage`: Calls `useAuth().login(data)` on submit and navigates via `useNavigate()` (`navigate(from, { replace: true })`), or renders `<Navigate to={from} replace />` when `user` is already present.
- `ProtectedRoute.tsx:ProtectedRoute`: Renders `<Navigate to="/login" state={{ from: location }} replace />` when `!loading && !user`.
- `RegisterPage.tsx:RegisterPage`: Calls `useAuth().register(data)` on submit and navigates via `useNavigate()` (`navigate('/lotes', { replace: true })`), or renders `<Navigate to="/lotes" replace />` when `user` is already present.
- `UserProfileMenu.tsx:UserProfileMenu`: Attaches and removes `document` `'mousedown'` and `'keydown'` listeners in `useEffect` when `isOpen` is `true`; calls `useAuth().logout()`, navigates to `'/login'` via `useNavigate()`, and logs failures with `console.error('Logout error:', err)`.

## Verification
- Run: `npm test -- --run`
