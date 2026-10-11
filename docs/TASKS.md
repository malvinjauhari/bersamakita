# Tasks & Recommendations

This document tracks known issues, technical debt, and recommended fixes based on the current architecture.

## Status Summary

The previously documented issues are **resolved**:

- ~~**[ISSUE-1] Payment Callback Firestore Update (PARTIAL/BROKEN)**~~ — **RESOLVED**: `POST /api/payments/duitku/callback` validates HMAC-SHA256, is idempotent, and updates `payments`, `donations`, and `trackingEvents` via the Firebase Admin SDK.
- ~~**[ISSUE-2] Missing `firebase-admin` Configuration**~~ — **RESOLVED**: backend uses the Admin SDK (`src/config/firebase-admin.ts`) for all administrative writes; `/api/admin/reset-transactions` no longer signs in as a regular user.
- ~~**[ISSUE-3] Secrets Management**~~ — **RESOLVED**: all credentials live in `.env` (backend, non-`VITE_`); `.env.example` documents every variable.
- ~~**[ISSUE-4] Error Handling on BMKG Proxies**~~ — **RESOLVED**: `server/routes/bmkg.ts` adds an 8-second `AbortSignal.timeout()`, a `User-Agent` header, non-OK status detection, and `502` JSON responses on failure.

## Remaining Recommendations (Non-Blocking)

- **[REC-1] Rotate leaked credentials**: Duitku API Key, Merchant Code, and Admin Secret Key were previously hardcoded and live in git history.
  - `ADMIN_SECRET_KEY` — **DONE (2026-10)**: rotated in local `.env` and Vercel production env.
  - Duitku API Key / Merchant Code — **PENDING user action**: generate fresh **production** keys from the Duitku merchant dashboard and update `DUITKU_MERCHANT_CODE` + `DUITKU_API_KEY` (`.env` + Vercel) before go-live.
  - GitHub `ghp_` / Vercel `vcp_` tokens shared in chat — **revoked** (see `docs/GIT_STATE.md`).
- **[REC-2] Vercel env completeness**: ensure `CRON_SECRET` is set for the `expire-sweep` cron and that `DUITKU_ENVIRONMENT` stays `sandbox` until production sign-off.
- **[REC-3] Firestore indexes**: confirm composite indexes (e.g., `donations` by `status` + `createdAt`, `payments` by `donationId`) match `firestore.indexes.json` before heavy usage.
- **[REC-4] Rate limiting & abuse protection**: consider `express-rate-limit` on `/api/payments/duitku/*` and `/api/admin/*` in production.
- **[REC-5] Production Duitku checklist**: flip `DUITKU_ENVIRONMENT=production`, verify callback/return URLs use HTTPS `APP_URL`, and run the sandbox test suite (`test-callback.ts`, `test-admin.ts`) one last time.
- **[REC-6] CI**: add a GitHub Action running `npm run lint` + `npm run build` (and optionally `firebase emulators:exec` for Firestore rules tests).

## Recommended Fix Order (if any item above is picked up)
1. Rotate secrets and update `.env` + Vercel env. (REC-1)
2. Set `CRON_SECRET` on Vercel. (REC-2)
3. Add rate limiting and CI. (REC-4, REC-6)