# Bersama Kita - AI Agent Protocols & Permanent Rules

This file serves as a memory buffer and strict guideline for future AI Agents / LLMs working on this codebase.

## System Architecture Context

- **Frontend**: React + Vite (TypeScript, TailwindCSS).
- **Backend**: Express (Node.js/TypeScript). Acts as a webhook receiver (Duitku) and API Proxy (BMKG).
- **Database**: Firebase Firestore.
- **Authentication**: Firebase Client Auth for Users, Custom JWT/LocalStorage session for Admins & Partners.
- **Payment Gateway**: Duitku (POP Sandbox).

## Permanent Business Rules

### 1. BMKG Integration & Disaster Verification
> **BMKG data must NEVER become publicly visible automatically. A disaster is publicly visible ONLY after an authorized admin explicitly clicks APPROVE. There is NO 24-hour auto-approval, NO auto-publish, and NO pending/placeholder disaster shown to users. Before approval, the public disaster state must be EMPTY.**

- **Flow**: BMKG Fetch → Save Disaster → PENDING_APPROVAL → Admin Review + Mitra Assignment → Admin Approval → ACTIVE (admin_approved) → User
- **BMKG is Data Only**: Do not treat BMKG as a source of approval.
- **No Auto-Approve / No Auto-Publish / No Fallbacks**: Do not reintroduce any 24-hour auto-approval cron job or script. Do not write logic that defaults `status` to `published` or `admin_approved` upon fetching. Do not add UI fallbacks that show pending data as placeholders. All new BMKG ingestion must be `pending_verification`.
- **Mitra Assignment is Mandatory**: Admin must assign a Field Partner (Mitra Lapangan) before approving. Do not bypass this validation.
- **Visibility**: Only `admin_approved` (ACTIVE) disasters are shown to public users. Before that, users must see an EMPTY state.

### 2. Duitku Payment Gateway & Callbacks
- **Idempotency**: Duitku callback processing in backend must remain idempotent. If a callback arrives for a payment that is already `PAID`, return `success: true` and gracefully exit without mutating donations again.
- **Signature Validation**: Use HMAC-SHA256 for callback signature validation. Do not disable `checkSignature` in Duitku callback.
- **Source of Truth**: Never trust payment success signals originating from the client/frontend. Always rely on the backend callback or `/check-status` API. The frontend `TransactionCheckoutPage` MUST NOT directly mutate Firestore payment status to "paid".
- **Direct API**: Use Duitku Direct API (e.g. `SP` for QRIS, `DA` for DANA) and render `qrString` or redirect to `paymentUrl`. Do not use `window.checkout.process` (Duitku POP).

### 3. Security & Credentials
- **No Hardcoded Secrets**: All keys (Firebase Service Account, Duitku Merchant Code/API Key, Admin credentials) must remain in environment variables.
- **Separation of Secrets**: Frontend env vars must begin with `VITE_`. Backend secrets (like `DUITKU_API_KEY`) must never have the `VITE_` prefix to prevent them from leaking into the React bundle.
- **Firebase Admin**: The backend Express server must use the Firebase Admin SDK to perform administrative writes (e.g., updating payment statuses). The frontend admin panel should avoid bypassing security rules and rely on standard authenticated workflows where necessary.

### 4. Partner Account & Authentication
> **Partner account can ONLY be created through the authorized Admin Dashboard. Regular users cannot self-register as Partner. Firebase Authentication manages credentials, while Firestore stores Partner profile and role information. Passwords must never be stored in Firestore.**
- **Creation Flow**: Admin inputs partner details -> POST `/api/admin/create-partner` -> Backend creates Firebase Auth user & Firestore documents (`role: 'partner'`).
- **Authorization**: Backend endpoints must validate the caller's Firebase ID token via `adminAuth.verifyIdToken()` and confirm admin privileges before executing sensitive actions.
- **Partner Access**: Partners authenticate via standard Firebase `signInWithEmailAndPassword`. `firestore.rules` checks the caller's role in the `users` collection to grant scoped access.
- **Single Source of Truth**: Firebase is the single source of truth for Partner information. Disaster stores the Partner relationship/reference (`partnerId`), and all user-facing Partner information must be resolved dynamically from the current Partner data in Firebase. Never hardcode or duplicate Partner profile data (like logo, description) across frontend pages.

## Agent Guidelines
1. **Read the Troubleshooting Log**: Always review `docs/TROUBLESHOOTING.md` before implementing complex logic or modifying core authentication/database systems. Past mistakes (e.g., UI-only auth mocking causing Firestore permission crashes) are documented there to prevent regression.
2. **Do Not Hallucinate Features**: Only document or work on features that actually exist in the codebase.
3. **Audit Before Modifying**: Do not assume the behavior of `firestore.rules`, `server.ts`, or any core component without reading it first.
4. **Respect Established Boundaries**: Keep frontend React logic out of Express endpoints, and keep Express endpoints thin and focused on secure integrations.
