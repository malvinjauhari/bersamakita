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
  - GitHub `ghp_` / Vercel `vcp_` tokens shared in chat — **revoked? — TIDAK (verifikasi 2026-10-12)**: token `ghp_...cfDK` yang dikirim user ternyata **MASIH VALID** (`gh auth login` sukses; scope `repo` penuh). Yang invalid hanya token lama di keyring mesin. Push `e5a041a..498ddfc` berhasil (hotfix `e560bc5` + docs `498ddfc`). **Catatan**: klaim "8 commit belum pernah ter-push" di versi sebelumnya SALAH — remote sudah di `e5a041a`; referensi lokal `origin/main` yang stale (belum pernah di-`fetch`).

## Referensi penyelesaian Task 7
- **Task 7 — Sinkronisasi Database & Progress Target Donasi**: akar masalah ditutup oleh refactor kolektif (endpoint `GET /api/fundraising/summary` + `report/:disasterId` sebagai satu-satunya sumber progres; target global `disasters.fundingTarget`; agregasi server hanya `status === 'paid'`; anti-double-count via callback idempotent + read-time tanpa counter). Audit & bukti: `scripts/qa-phase6.ts` (summary/report identik guest=userA=userB; donasi `pending_payment` tidak mengubah `collected`/`donationCount`; write kolektif ditolak user biasa; baca `admin_approved` = 200). Hotfix pasca-hardening (2026-10-12): seluruh ingest BMKG pindah ke `POST /api/bmkg/refresh` server-side (tidak ada lagi tulis client ke `earthquakeEvents`/`disasters`); inisialisasi Firebase Storage mati dihapus. Detail di `docs/TROUBLESHOOTING.md`.
- **[REC-2] Vercel env completeness**: ensure `CRON_SECRET` is set for the `expire-sweep` cron and that `DUITKU_ENVIRONMENT` stays `sandbox` until production sign-off.
- **[REC-3] Firestore indexes**: confirm composite indexes (e.g., `donations` by `status` + `createdAt`, `payments` by `donationId`) match `firestore.indexes.json` before heavy usage.
- **[REC-4] Rate limiting & abuse protection**: consider `express-rate-limit` on `/api/payments/duitku/*` and `/api/admin/*` in production.
- **[REC-5] Production Duitku checklist**: flip `DUITKU_ENVIRONMENT=production`, verify callback/return URLs use HTTPS `APP_URL`, and run the sandbox test suite (`test-callback.ts`, `test-admin.ts`) one last time.
- **[REC-6] CI**: add a GitHub Action running `npm run lint` + `npm run build` (and optionally `firebase emulators:exec` for Firestore rules tests).

## Recommended Fix Order (if any item above is picked up)
1. Rotate secrets and update `.env` + Vercel env. (REC-1)
2. Set `CRON_SECRET` on Vercel. (REC-2)
3. Add rate limiting and CI. (REC-4, REC-6)