# Tasks & Recommendations

This document tracks known issues, technical debt, and recommended fixes based on the current architecture.

## Current Issues & Technical Debt
- **[ISSUE-1] Payment Callback Firestore Update (PARTIAL/BROKEN)**: 
  - **Context**: `server.ts` receives the Duitku callback (`/api/payments/duitku/callback`), validates the signature, but only logs the outcome. It does *not* update the Firestore `donations` and `payments` documents.
  - **Impact**: Relies on frontend polling or manual verification to finalize transaction status.
  - **Debt**: Lacks Firebase Admin SDK initialization in the backend (with service account credentials) to perform secure background updates.

- **[ISSUE-2] Missing `firebase-admin` Configuration**:
  - **Context**: `package.json` includes `firebase-admin`, but `server.ts` attempts to circumvent admin privileges by signing in as a regular user (`admin_backend@bersamakita.org`) via client SDK (`signInWithEmailAndPassword`) in the `/api/admin/reset-transactions` endpoint.
  - **Debt**: This is an anti-pattern for server environments and should be replaced with `firebase-admin`.

- **[ISSUE-3] Secrets Management**:
  - **Context**: Hardcoded credentials in `server.ts` (e.g., Duitku API keys, fallback admin passwords).
  - **Debt**: These should strictly use environment variables and be removed from source code.

## Recommended Fix Order
1. **Configure Firebase Admin SDK**: Set up the backend to securely access Firestore using a service account instead of client-side authentication.
2. **Implement Payment Webhook Logic**: Update the Duitku callback in `server.ts` to use Firebase Admin SDK to update the `donations` and `payments` collection statuses directly.
3. **Refactor Hardcoded Secrets**: Move all fallback API keys and passwords to the `.env` file.
4. **Error Handling on BMKG Proxies**: Enhance the error handling and retry mechanisms on `/api/bmkg/autogempa` and `/api/bmkg/gempaterkini`.
