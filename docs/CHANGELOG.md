# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- Created `.env.example` with blank placeholders for secure local environment setup.
- Created `test-callback.ts` to verify the robustness of the Duitku callback implementation.
- Created `test-admin.ts` to verify Firestore Read, Write, and Delete operations using Admin SDK.
- Created `src/config/firebase-admin.ts` to initialize Firebase Admin SDK using environment variables.
- Added default values to `.env` file for Duitku and internal secrets.

### Changed
- **Payment Gateway**: Replaced mock payment integration with Real Duitku Direct API (`SP` for QRIS, `DA` for DANA). Upgraded webhook signature to HMAC-SHA256, added `/api/payments/duitku/check-status`. Overhauled `TransactionCheckoutPage` to remove POP integration and display raw `qrString` with proper timers.
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
- None yet.

### Fixed
- None yet.

### Security
- None yet.
