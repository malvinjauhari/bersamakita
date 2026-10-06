# Authentication & Authorization

## Rule: Partner Account Creation
> **Partner account can ONLY be created through the authorized Admin Dashboard. Regular users cannot self-register as Partner. Firebase Authentication manages credentials, while Firestore stores Partner profile and role information. Passwords must never be stored in Firestore.**

## Actors & Roles

1. **User (Donatur)**
   - Sign in via Google Auth (`google.com` provider).
   - Saved in Firestore `users` collection with `role: 'user'`.
   - Cannot create partner accounts.

2. **Admin (Operasional)**
   - Hardcoded master admin login (`bersamakita.my.id@protonmail.com`).
   - Or Firebase Auth users with `role: 'admin'` in their `users` document.
   - Authorized to manage BMKG disasters, disbursements, and create Partner accounts via backend `/api/admin/*` endpoints.

3. **Partner (Mitra Lapangan)**
   - Account can ONLY be created by an Admin via the Admin Dashboard.
   - Credentials (email/password) are managed by Firebase Authentication.
   - Saved in Firestore `users` collection with `role: 'partner'` AND `partners` collection.
   - Authorized to manage distribution reports and partner dashboard.

## Security Controls
- **Client Side**: `AuthContext.tsx` handles checking custom roles (`isAdminAuthenticated`, `isPartnerAuthenticated`) and routes protection.
- **Backend / API Server Side**: All `/api/admin/*` routes expect a Firebase ID Token (`Authorization: Bearer <token>`). The server uses the Firebase Admin SDK to decode the token and cross-checks the user's role against the `users` Firestore collection before performing sensitive operations like `adminAuth.createUser()`.
- **Database Rules**: `firestore.rules` enforces row-level security. Partner accounts can only write to specific reports and their own dashboard. User data is strictly isolated (`request.auth.uid == userId`).
