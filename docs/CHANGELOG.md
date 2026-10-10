# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- **Transparent 0,17% admin fee**: single source of truth in `src/lib/fees.ts` (`ADMIN_FEE_RATE`, `calculateAdminFee`, `calculateTotalPayment`, `MIN_WITHDRAWAL`) shared by frontend and backend. Fee is charged on top of the donation (`Total Dibayar = Donasi + Biaya Admin`), stored separately (`payments.fee`), and displayed on the donate page (with "Kenapa ada biaya admin?" explainer), on the checkout page, and in the public Riwayat Dana Masuk.
- **`GET /api/transparency/summary`** public endpoint (Firebase Admin SDK): riwayat dana masuk per donatur + total/biaya admin/per-bencana fundraising totals — identical data for every role without relaxing `firestore.rules`.
- **TransparencySummarySection** on the Transparansi Penyaluran page (topmost): "Riwayat Dana Masuk" (donatur, keterangan, waktu, donasi, biaya admin 0,17%, total, metode QRIS) and "Informasi Penggalangan Dana" (nama bencana, total terkumpul, jumlah donatur, riwayat transaksi dengan filter per bencana).
- Withdrawal transparency: `Disbursement` now records `fee` + `totalAmount`; the pencairan modal shows a live breakdown (Saldo Tersedia / Dana Ditarik / Biaya Admin 0,17% / Total Pengeluaran).
- Created `.env.example` with blank placeholders for secure local environment setup.
- Created `test-callback.ts` to verify the robustness of the Duitku callback implementation.
- Created `test-admin.ts` to verify Firestore Read, Write, and Delete operations using Admin SDK.
- Created `src/config/firebase-admin.ts` to initialize Firebase Admin SDK using environment variables.
- Added default values to `.env` file for Duitku and internal secrets.

### Changed
- **Massive Folder Structure Refactoring (Feature-Driven Architecture)**: Migrated `src/domains/` to `src/features/` and `src/integrations/` to `src/services/` to follow a scalable, modular architecture without altering functionality or routing.
- **Backend Monolith Splitting**: Refactored the single `server.ts` monolith (900+ lines) into a modular `server/` directory, introducing individual route handlers (`server/routes/bmkg.ts`, `server/routes/payments.ts`, `server/routes/transparency.ts`, `server/routes/admin.ts`, `server/routes/images.ts`) and a clean entry point (`server/app.ts`).
- **Tailwind CSS v4 Upgrade**: Automated the syntax migration across all frontend components (e.g. `max-w-[400px]` to `max-w-100`, `bg-gradient-to-r` to `bg-linear-to-r`) using `@tailwindcss/upgrade`.
- **Comprehensive UI/UX Overhaul**: Upgraded design aesthetics across multiple domains (Disaster Management, Donation Flows, Transparency Reports, Partner/Admin Dashboards) using modern styling, dynamic layouts, and consistent theming.
- **QRIS-only payment gateway**: removed DANA/ShopeePay options from UI (`TransactionDonatePage`) and API (server whitelist `['SP']`, rejects `DA`/`SA`). `PaymentService` maps `qris → SP` exclusively.
- **Withdrawal minimum**: pencairan raised from Rp50.000 to **Rp1.000.000** (`MIN_WITHDRAWAL`); the "Buat Pengajuan Pencairan" button is disabled while available balance is below the minimum, and the submit button validates amount + fee against the disaster's remaining cash.
- **Role-synced data**: `getDistributionReports()` falls back to a `status in ['submitted','published']` query when the unfiltered list is denied by `firestore.rules`, so guests/users see the same reports as staff; regular authenticated users now also fetch `partnerAllocations` for the transparency monitoring section.
- **Payment gateway**: Replaced mock payment integration with Real Duitku Direct API. Upgraded webhook signature to HMAC-SHA256, added `/api/payments/duitku/check-status`. Overhauled `TransactionCheckoutPage` to remove POP integration and display raw `qrString` with proper timers.
- Removed hardcoded Duitku API Key (`<redacted>`) and Merchant Code (`<redacted>`) from frontend (`DuitkuSettingsView.tsx`). Both are now securely isolated in backend environment variables.
- Refactored frontend Admin Reset action to securely prompt the user for the `ADMIN_SECRET_KEY` instead of hardcoding `<redacted>` in the code bundle.
- Removed hardcoded credentials from documentation (`PAYMENT.md`, `API.md`).
- Implemented real-time Firestore synchronization in `/api/payments/duitku/callback` using Firebase Admin SDK.
- Enhanced callback with idempotency checks, signature validation, and graceful handling of unknown references.
- Refactored `server.ts` to use `process.env` for all sensitive credentials (Duitku keys, admin secrets) instead of hardcoding.
- Refactored `/api/admin/reset-transactions` to use Firebase Admin SDK instead of client-side authentication workaround.

### Deprecated
- None yet.

### Removed
- **"Aksi Cepat Tahap Selanjutnya (Tinggal Klik)"** quick-action bar removed from the user-facing Transparansi Penyaluran page (`PublicReportsView` defaults to read-only `progressMode="donor"`; the admin portal opts back in with `progressMode="admin"`).
- E-Money/DANA/ShopeePay payment options from the donation flow UI.

### Fixed
- **Disbursement balance check now includes the admin fee everywhere**: the "Buat Pengajuan Pencairan" gate and its hint now require `saldo ≥ MIN_WITHDRAWAL + biaya admin` (`MIN_WITHDRAWAL_TOTAL`, e.g. Rp1.000.000 + Rp1.700 = Rp1.001.700) instead of comparing the saldo with the nominal only, and the input's "Maksimal" hint shows `maxWithdrawableAmount(remaining)` (largest nominal whose nominal + fee still fits the remaining cash) instead of the raw remaining balance. Submit-time validation continues to compare `nominal + biaya admin` against the disaster's remaining cash.
- `payments` documents now store `userId`, so `firestore.rules` grants owners read access — checkout no longer shows "Transaksi Tidak Ditemukan" for regular users.
- `simulate-paid` / `expire-sweep` now record `paidAmount = amount + fee` (they previously wrote the nominal only once a fee existed).
- Status page receipt label clarified to "Nominal Donasi".

### Security
- None yet.
