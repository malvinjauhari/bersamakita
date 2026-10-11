# Project Contract & Rules

This document outlines the strict dependencies and rules that must be maintained when modifying this codebase to prevent breaking existing functionality.

## 1. Firebase Authentication & Firestore Rules
- **Rule**: Do not change the condition checks in `firestore.rules` without ensuring the UI gracefully handles permission errors.
- **Dependency**: The frontend uses `isAuthenticated()`, `isAdmin()`, and `isPartner()` roles based on email allowlists (e.g., `admin_backend@bersamakita.org`, `bersamakita.my.id@protonmail.com`, `partnerbersamakita@protonmail.com`) or the `role` field in the `users` collection.
- **Contract**: Role definitions (`UserRole`) in `src/types/index.ts` must match `firestore.rules`.

## 2. Duitku Integration Flow
- **Rule**: Do not modify the `merchantOrderId` format or the signature mechanisms in `server/routes/payments.ts` without checking the Duitku API docs:
  - inquiry signature: **MD5** (`merchantCode + merchantOrderId + paymentAmount + apiKey`)
  - callback signature: **HMAC-SHA256** (`merchantCode + amount + merchantOrderId`, key = `DUITKU_API_KEY`)
  - check-status signature: **HMAC-SHA256** (`merchantCode + merchantOrderId`, key = `DUITKU_API_KEY`)
- **Dependency**: The Duitku callback **is the source of truth** for payment success — it validates the signature, is **idempotent**, and writes `payments`/`donations` (+ `trackingEvents`) via the **Firebase Admin SDK**. Never trust a "paid" signal coming from the frontend, and never disable signature checks.

## 3. BMKG Data Proxy
- **Rule**: Do not call the BMKG API directly from the frontend.
- **Dependency**: Browser CORS blocks direct requests to `data.bmkg.go.id`. You MUST use the backend proxies `GET /api/bmkg/autogempa` and `GET /api/bmkg/gempaterkini`.
- **Rule (business)**: Never reintroduce auto-approval/auto-publish. All new BMKG ingestion must be `pending_verification` and only become visible after an admin explicitly approves with a Mitra assigned. See `docs/DISASTER.md`.

## 4. Environment Variables
- **Rule**: `.env` is loaded via `dotenv.config()` in `server/app.ts`; the frontend only consumes `VITE_`-prefixed variables.
- **Dependency**: Backend secrets (`DUITKU_API_KEY`, `ADMIN_SECRET_KEY`, `CRON_SECRET`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `CLOUDINARY_*`) must never have the `VITE_` prefix and must never be hardcoded in source.

## 5. Development Server
- **Rule**: `npm run dev` executes `tsx server/app.ts`. The server boots the Express app and runs the Vite middleware dynamically in development on port 3005.
- **Dependency**: Do not separate frontend/backend start commands in development; the backend serves the API for the frontend on the same port.
- **Rule**: On Vercel, `api/index.ts` exports the Express `app` as a serverless function — do not call `app.listen()` there (`server/app.ts` guards it with `!process.env.VERCEL`).

## 6. Firestore Structure
- **Rule**: Types defined in `src/types/index.ts` must exactly mirror the documents written to Firestore. If you add a field, add it to the Type first.
- **Rule**: All sensitive writes (payment statuses, partner creation, admin actions) must go through the backend using the Firebase Admin SDK, not through client-side workarounds.

## 7. Documentation Sync
- **Rule**: `docs/` must reflect the current code. After any refactor, update `API.md`, `ARCHITECTURE.md`, `DATABASE.md`, and `CHANGELOG.md` in the same commit.