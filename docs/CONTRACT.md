# Project Contract & Rules

This document outlines the strict dependencies and rules that must be maintained when modifying this codebase to prevent breaking existing functionality.

## 1. Firebase Authentication & Firestore Rules
- **Rule**: Do not change the condition checks in `firestore.rules` without ensuring the UI gracefully handles permission errors.
- **Dependency**: The frontend uses `isAuthenticated()`, `isAdmin()`, and `isPartner()` roles based on specific email checks (e.g., `admin_backend@bersamakita.org`, `partnerbersamakita@protonmail.com`) or role fields in the `users` collection.
- **Contract**: Role definitions (`UserRole`) in `src/types/index.ts` must match `firestore.rules`.

## 2. Duitku Integration Flow
- **Rule**: Do not modify the `merchantOrderId` format or signature hashing mechanism in `server.ts` without checking Duitku API docs.
- **Dependency**: The Duitku callback currently only logs output and does *not* write to Firestore directly. Any refactoring of payment status resolution must account for this (currently handled by frontend polling or manual verification).

## 3. BMKG Data Proxy
- **Rule**: Do not call the BMKG API directly from the frontend.
- **Dependency**: Browser CORS policies block direct requests to `data.bmkg.go.id`. You MUST use the `server.ts` proxies (`/api/bmkg/autogempa` and `/api/bmkg/gempaterkini`).

## 4. Environment Variables
- **Rule**: The `.env` file should be loaded using `dotenv.config()` in `server.ts` and Vite's built-in env handling (for `VITE_` prefixed vars) in the frontend.

## 5. Development Server
- **Rule**: The script `npm run dev` executes `tsx server.ts`. The `server.ts` file boots up the Express app and runs the Vite middleware dynamically in development.
- **Dependency**: Do not separate the frontend and backend start commands in development, as the backend serves as the API for the frontend on the same port (3005).

## 6. Firestore Structure
- **Rule**: Types defined in `src/types/index.ts` must exactly mirror the documents written to Firestore. If you add a field, add it to the Type first.
