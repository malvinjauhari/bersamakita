# Current State

## Milestones Achieved

- **Phase 1: Backend & Firebase Admin Integration**
  - Secured the backend to use the Firebase Admin SDK via service account env (`src/config/firebase-admin.ts`).
  - Replaced frontend client SDK workarounds for admin actions (`/api/admin/reset-transactions` now uses Admin SDK).
- **Phase 2: Duitku Payment Gateway Callback Integration**
  - Callback signature verified (HMAC-SHA256).
  - Duplicate/idempotent callbacks handled correctly.
  - `payments`/`donations` updated securely via Admin SDK — no client trust.
- **Phase 3: Security & Environment Cleanup**
  - Hardcoded API Keys, Merchant Codes, and service accounts removed.
  - Secrets moved to `.env` (backend, non-`VITE_`), `.env.example` created (incl. `CRON_SECRET`).
- **Phase 4: BMKG Integration Revamp (Strict Manual Approval)**
  - All `gempaterkini` events fetched (no `.slice(0,5)`).
  - All auto-publish / 24-hour rule engine / empty-database fallbacks removed.
  - Strict flow: `BMKG Fetch → Save Disaster → PENDING_APPROVAL → Admin Review + Mitra Assignment → Admin Approval → ACTIVE`.
  - Admin must assign a Mitra Lapangan before approving.
- **Phase 5: Partner Authentication Flow**
  - Partners can only be created by Admins via `POST /api/admin/create-partner` (verified Firebase ID token + admin role check).
  - `role: 'partner'` written to `users`; profile written to `partners`; password never stored in Firestore.
  - `PartnerAuthPage` uses standard `signInWithEmailAndPassword` → sessions enforced by `firestore.rules`.
- **Phase 6: Real Payment Gateway Integration (QRIS-only)**
  - Duitku **Direct API** (not POP): raw `qrString` rendered on checkout; DANA/ShopeePay e-money options removed.
  - Webhook securely handles HMAC-SHA256 signatures and writes to Firestore.
  - `/check-status` for frontend polling; frontend never marks a payment as paid by itself.
- **Phase 7: Feature-Driven Refactor & Documentation Sync**
  - Migrated `src/domains/` → `src/features/` and `src/integrations/` → `src/services/`.
  - Split the `server.ts` monolith into `server/app.ts` + `server/routes/*`.
  - Upgraded to TailwindCSS v4; comprehensive UI/UX overhaul.
  - Documentation (`docs/`, `README.md`) synchronized with the actual code.
- **Phase 8: Refactor Donasi Kolektif — progres/pencairan/timeline laporan SINKRON per `disasterId`**
  - **Fase 1**: `GET /api/fundraising/summary` — agregasi server-side (Admin SDK) donasi+payment `paid` + pencairan per bencana + total (semantik `DisbursementManager`).
  - **Fase 2**: `useFundraisingSummary` + `getDisasterStats` — progres KOLEKTIF identik utk semua akun di dashboard/katalog/halaman donasi (target fungsi `FUNDRAISING_TARGET`).
  - **Fase 3**: `POST /api/fundraising/admin/disbursements` (validasi saldo + transaksi atomik server); koleksi `disasterTimeline/{disasterId}/events` — SATU timeline utk SEMUA donatur; event otomatis (pencairan, dana diterima mitra, milestone).
  - **Fase 4**: `GET /api/fundraising/report/:disasterId` (laporan akhir derive dari transaksi nyata, publik, tanpa PII) + `POST /api/fundraising/admin/close` (status `archived`, atomik & idempoten) + UI laporan akhir & tombol "Tutup Penggalangan".
  - **Fase 5**: Hardening `firestore.rules` (write kolektif → least privilege) + `POST /api/bmkg/refresh` (ingest BMKG server-side utk user biasa; earthquake/disasters write = admin/partner).
  - **Fase 6**: Docs sinkron (`API.md`/`CHANGELOG.md`/`DATABASE.md`) + **QA sandbox 2 akun Firebase** (`scripts/qa-phase6.ts`, user dibuat & dihapus otomatis): summary & report IDENTIK antar-akun; user biasa ditolak menulis koleksi operasional.
  - **Fase 6.1 (hotfix)**: hapus sisa jalur tulis BMKG sisi klien — pool check (`loadData`) & admin refresh kini pakai `POST /api/bmkg/refresh` server-side (helper `refreshBMKGServer()`); `getDisasters('all')` tak lagi dipanggil saat bootstrap; inisialisasi Firebase Storage yang mati dihapus (`getStorage`). Default **"klien hanya baca; semua write via endpoint + Admin SDK"** berlaku penuh (utk disaster/earthquake). QA: user biasa baca `admin_approved` = 200, tulis = 403. Detail: `docs/TROUBLESHOOTING.md`.
  - **Fase 6.2 (hotfix)**: `POST /api/admin/create-partner` 403 utk Master Admin — allowlist `create-partner` kini memuat ketiga email admin (`admin_backend@bersamakita.org`, `contohasdf@gmail.com`, `bersamakita.my.id@protonmail.com`), selaras `firestore.rules` & endpoint lain; helper terpusat `staffRoleForEmail()` mencegah role staf (`admin`/`partner`) tertimpa `'user'` di `users/{uid}` saat sign-in/refresh.
  - **Fase 6.3 (hotfix)**: Login Google diganti **popup → redirect** (`signInWithRedirect` + `completeGoogleRedirect` saat mount) — kebal popup blocker (`auth/popup-blocked`) & ekstensi pemblokir (`ERR_BLOCKED_BY_CLIENT`); **fallback sesi fiktif "Donatur Google" dihapus** (sebelumnya membuat uid palsu → permission-denied di dashboard) + purge otomatis sesi fiktif lama; error sign-in kini tampil jujur lewat `googleSignInErrorMessage`.
  - **Fase 6.4 (hotfix)**: Hardening storage pasca-redirect — `src/lib/safe-storage.ts` (seluruh akses storage tidak pernah throw), `ensureAuthPersistence()` berlapis (local → session → memory), probe storage + flag `storageBlocked`/`redirectError` di `AuthContext`, banner panduan di `UserLoginPage`. Mengatasi `Uncaught (in promise) Access to storage is not allowed from this context` + stuck di halaman login saat site storage diblokir.

## Outstanding Issues

- **None currently identified for the core flows.** The system is fully aligned with strict verification, security, and administrative compliance.
- Known operational notes (not bugs): `CRON_SECRET` should be set in the Vercel project for the `expire-sweep` cron; `DUITKU_ENVIRONMENT` must be flipped to `production` only when ready for live payments.
- **Security (user action needed)**: rotasi token GitHub lama yang pernah terekspos di percakapan, dan revoke token Vercel lama (`vcp_6vDoVjQh...`) bila tak terpakai.

## Environment Variables Requirement
See `.env.example` for the required configuration. Backend requires `FIREBASE_SERVICE_ACCOUNT_JSON`, `DUITKU_MERCHANT_CODE`, `DUITKU_API_KEY`, `ADMIN_SECRET_KEY`, `CRON_SECRET` (for cron), and optionally `CLOUDINARY_*`.