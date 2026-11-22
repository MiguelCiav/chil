# Auth Components

## Overview
Authentication UI components implementing login, registration, password reset modal, route protection, and the authenticated user profile dropdown menu, integrated with `useAuth`, `react-hook-form` + Zod schemas, and `react-router-dom`.

## Interface
- `AuthLayout.tsx:AuthLayoutProps`: Props interface `{ title: string; subtitle: string; footerPrompt: string; footerLinkLabel: string; footerLinkTo: string; children: React.ReactNode }`.
- `AuthLayout.tsx:AuthLayout`: `React.FC<AuthLayoutProps>` rendering the shared centered `<Card>` + `<h1>` header + footer link wrapper for public auth routes.
- `ForgotPasswordModal.tsx:ForgotPasswordModalProps`: Props interface `{ isOpen: boolean; onClose: () => void; defaultEmail?: string }` for `ForgotPasswordModal`.
- `ForgotPasswordModal.tsx:ForgotPasswordModal`: `React.FC<ForgotPasswordModalProps>` rendering the password recovery modal.
- `LoginPage.tsx:LoginPage`: `React.FC` rendering the sign-in page via `AuthLayout`, `Field`, `PasswordField`, and `ErrorAlert`.
- `PasswordField.tsx:PasswordFieldProps`: Props interface extending `Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>` (`label`, `labelAction?`, `errorText?`, `showToggleLabel?`, `hideToggleLabel?`).
- `PasswordField.tsx:PasswordField`: `React.forwardRef<HTMLInputElement, PasswordFieldProps>` rendering canonical `Field` tokens with visibility toggle and `role="alert"` error text.
- `ProtectedRoute.tsx:ProtectedRouteProps`: Props interface `{ children?: ReactNode }` for `ProtectedRoute`.
- `ProtectedRoute.tsx:ProtectedRoute`: `React.FC<ProtectedRouteProps>` guarding authenticated routes.
- `RegisterPage.tsx:RegisterPage`: `React.FC` rendering the account registration page via `AuthLayout`, `Field`, `PasswordField`, and `ErrorAlert`.
- `SessionLoadingState.tsx:SessionLoadingStateProps`: Props interface `{ label?: string }` (`label` defaults to `'Cargando sesión'`).
- `SessionLoadingState.tsx:SessionLoadingState`: `React.FC<SessionLoadingStateProps>` rendering the `<output aria-live="polite">` loading spinner shared by `ProtectedRoute` and `App.tsx`.
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
