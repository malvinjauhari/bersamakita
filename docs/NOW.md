# Current Project Snapshot

## Stack
- Frontend: React 19, Vite 8, TailwindCSS v4, React Router 7
- Backend: Node.js 22, Express (modular `server/app.ts` + `server/routes/`)
- Database/Auth: Firebase Firestore, Firebase Auth, Firebase Admin SDK
- Payment Gateway: Duitku Direct API (QRIS only, sandbox)
- External API: BMKG (via backend proxy), Cloudinary (image hosting)
- Deploy: Vercel (serverless `api/index.ts` + static `dist/`)

## Features Status

### Stable (IMPLEMENTED)
- **Frontend Routing & UI**: Feature-driven `src/features/` structure; core dashboard, auth UIs, and public pages complete and responsive.
- **Firebase Auth**: User, Admin, and Partner logins as defined in `App.tsx` and `firestore.rules`.
- **Firebase Admin SDK**: STABLE / VERIFIED (via `FIREBASE_SERVICE_ACCOUNT_JSON` env, never hardcoded).
- **BMKG Proxy**: `/api/bmkg/autogempa` & `/api/bmkg/gempaterkini` fetch with 8s timeout and 502 error handling.
- **Role-Based Access Control**: `firestore.rules` limit data exposure (admin_approved disasters visible publicly, pending hidden).
- **Duitku Create Invoice**: STABLE (Direct API, QRIS `SP`, MD5 inquiry signature, 0,17% fee computed server-side).
- **Duitku Callback**: STABLE (idempotent, HMAC-SHA256, writes via Admin SDK).
- **Check-Status / Simulate-Paid / Expire-Sweep**: STABLE (sandbox demo + Vercel Cron sweep).
- **Payment → Firestore Sync**: STABLE (payments, donations, trackingEvents).
- **Transparency Summary**: STABLE (`GET /api/transparency/summary`, Admin SDK, identical for all roles).
- **Admin Partner Creation**: STABLE (`/api/admin/create-partner` with token verification + admin role check).
- **Admin Reset**: STABLE (guarded by `ADMIN_SECRET_KEY`, uses Admin SDK).
- **Secrets Management**: STABLE (no hardcoded keys; `.env` + `.env.example`).
- **Cloudinary Uploads**: STABLE (`/api/images/sign` + `src/services/cloudinary.ts`).

### Partial / Broken (PARTIAL/BROKEN)
- (None at the moment.)

### Not Implemented (NOT IMPLEMENTED)
- (None at the moment relating to baseline features.)

## Active Payment Gateway
- **Duitku Direct API — Sandbox** (`DUITKU_ENVIRONMENT=sandbox`), QRIS (`SP`) only.

## Current Issues
- No known major issues for the core flows. See `docs/TASKS.md` for the remaining recommendation list (operational hardening, production checklist).

## Current Task
- **Docs sync** (this snapshot): all documentation aligned with the post-refactor code (feature-driven `src/features/` + modular `server/routes/`), previous task items (Task 01–03) are complete: Admin SDK wiring, payment callback → Firestore sync, security cleanup to `.env`.

## Untouchable Parts (Without Explicit Reason)
- `firestore.rules`: Do not alter without syncing with frontend state logic & role helpers.
- Duitku signature logic in `server/routes/payments.ts`.
- BMKG proxy logic in `server/routes/bmkg.ts`.
- Vite + Express startup integration in `server/app.ts`.
- Strict approval flow for disasters (no auto-publish, mandatary Mitra assignment).

## Compromised Credentials (Must Rotate)
- Duitku API Key & Merchant Code: were hardcoded in frontend/backend and published in git history. **Rotated state: pending** — sandbox values are still in old commits; use freshly generated **production** values when going live.
- Admin Secret Key: was hardcoded in frontend/backend. **Rotated ✅** (new 64-char secret in local `.env` + Vercel production env).
- GitHub & Vercel tokens shared in chat (see `docs/GIT_STATE.md`): **revoked ✅** / manual revocation step provided.