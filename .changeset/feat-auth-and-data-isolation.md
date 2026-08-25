---
"chil": minor
---

Implement user authentication, registration, and strict per-user data isolation:
- **Authentication with Firebase Auth**:
  - Implemented `LoginPage` and `RegisterPage` with comprehensive form validation (via React Hook Form + Zod), password visibility toggles, and friendly error handling.
  - Implemented `ForgotPasswordModal` for self-service password recovery.
  - Created `AuthContext` and `useAuth` hook managing user session lifecycle, persistent authentication state, and actions (`login`, `register`, `logout`, `resetPassword`).
- **Route Protection & User Experience**:
  - Added `ProtectedRoute` guard redirecting unauthenticated users to `/login` with return destination preservation.
  - Added user profile dropdown menu (`UserProfileMenu`) in `Navbar` displaying user initials avatar, full name, email, and logout action.
  - Redirect authenticated users attempting to access `/login` or `/registro` directly to `/lotes`.
- **Strict Multi-Tenant Data Isolation by `user_id`**:
  - Scoped batch and member CRUD operations to the authenticated `user_id` (`createBatch`, `updateBatch`, `getAllBatches`, `createMember`, `updateMember`, `getAllMembers`).
  - Scoped custom recognition types to `user_id` (`createRecognitionType`, `updateRecognitionType`, `getAllRecognitionTypes`).
  - Scoped statistics dashboard and summary tables to only aggregate data belonging to the authenticated user.
- **Shared Scout Hierarchy**:
  - Maintained global shared access to the Scout geographic hierarchy (regions, districts, groups).
- **Testing & Quality Assurance**:
  - Full test coverage for authentication flows, API layer data scoping, protected routes, and components.
