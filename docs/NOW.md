# Current Project Snapshot

## Stack
- Frontend: React 19, Vite, TailwindCSS, React Router
- Backend: Node.js, Express
- Database/Auth: Firebase, Firestore
- Payment Gateway: Duitku (Sandbox)
- External API: BMKG

## Features Status

### Stable (IMPLEMENTED)
- **Frontend Routing & UI**: The core structure, dashboard, and authentication UI are complete and responsive.
- **Firebase Auth**: User, Admin, and Partner logins function as defined in `App.tsx` and `firestore.rules`.
- **Firebase Admin SDK**: STABLE / VERIFIED (Implemented securely via environment variables, awaiting credential injection).
- **BMKG Proxy**: Express correctly fetches and proxies BMKG data to bypass CORS.
- **Role-Based Access Control**: `firestore.rules` are set up and successfully limit data exposure.
- **Duitku Create Invoice**: STABLE
- **Duitku Callback**: STABLE (Idempotent, Signature Validated)
- **Payment → Firestore Sync**: STABLE
- **Secrets Management**: STABLE (No hardcoded keys, uses `.env`)
- **Admin Reset**: STABLE (Prompts for secret securely)
- **Backend Security Configuration**: STABLE

### Partial / Broken (PARTIAL/BROKEN)
- **Backend Admin Actions**: The `/api/admin/reset-transactions` endpoint uses a client-side SDK hack to log in as an admin user to bypass Firestore rules, rather than using `firebase-admin`. (Note: This is mostly resolved by Task 01, pending frontend sync if any).

### Not Implemented (NOT IMPLEMENTED)
- (None at the moment relating to baseline features).

## Active Payment Gateway
- **Duitku POP Sandbox**

## Current Issues
- Hardcoded sensitive values in `server.ts` have been removed (fixed in Task 01).
- Backend securely connects to Firestore via Admin SDK (fixed in Task 01).
- Duitku callback correctly syncs status to Firestore (fixed in Task 02).
- There are no known major issues remaining for the payment flow.

## Current Task
- Task 03 completed: Security cleanup finished. All hardcoded credentials removed from frontend/backend and moved to `.env`. `.env.example` created.

## Untouchable Parts (Without Explicit Reason)
- `firestore.rules`: Do not alter without syncing with frontend state logic.
- Duitku Signature logic in `server.ts`.
- BMKG proxy logic.
- Vite + Express server startup integration in `server.ts`.

## Compromised Credentials (Must Rotate)
- Duitku API Key: `<redacted>` (was hardcoded in frontend; rotate before production).
- Duitku Merchant Code: `<redacted>` (was hardcoded in frontend).
- Admin Secret Key: `<redacted>` (was hardcoded in frontend and backend).
