# API Integration Specifications

This document outlines the API endpoints provided by the backend (`server/app.ts` + `server/routes/*`) and external API usage.

> Backend entry points (mounted in `server/app.ts`):
> - `/api/bmkg` → `server/routes/bmkg.ts`
> - `/api/payments/duitku` → `server/routes/payments.ts`
> - `/api/transparency` → `server/routes/transparency.ts`
> - `/api/admin` → `server/routes/admin.ts`
> - `/api/images` → `server/routes/images.ts`
> - `/api/fundraising` → `server/routes/fundraising.ts`
>
> On Vercel, `api/index.ts` exports the same Express `app` as a serverless function, and any unmatched `/api/*` returns JSON 404 (never HTML).

## Internal Backend APIs

### BMKG Proxy (`/api/bmkg`)

1. **`GET /api/bmkg/autogempa`**
   - **Description**: Proxies `https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json` (gempa terbaru) with an 8s timeout and `User-Agent` header.
   - **Response**: `{ success: true, data: { ... } }` or `502 { success: false, message: '...' }` on BMKG failure.

2. **`GET /api/bmkg/gempaterkini`**
   - **Description**: Proxies `https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json` (daftar gempa terkini) with the same 8s timeout / 502 error handling.
   - **Response**: `{ success: true, data: { ... } }` or `502 { success: false, message: '...' }`.

> **Note**: The old `POST /api/bmkg/auto-verify` route (24-hour auto-approval rule engine) has been **removed**. BMKG is data-only; all ingested disasters are written by the frontend with `status: 'pending_verification'` and require explicit admin approval.

### Duitku Payment Gateway (`/api/payments/duitku`)

1. **`POST /api/payments/duitku/create`**
   - **Headers**: `Content-Type: application/json`
   - **Body**: `{ donationId, amount, donorName, donorEmail, donorPhone?, paymentMethod? }`
     - `amount` = **nominal donasi** (minimum **Rp10.000**).
     - `paymentMethod` must be `'SP'` (QRIS) or omitted (defaults to QRIS). `'DA'`/`'SA'` are rejected with `400 "Metode pembayaran tidak didukung. Hanya QRIS."`
   - **Description**: Computes the transparent 0,17% admin fee server-side (`src/lib/fees.ts`) and charges `paymentAmount = amount + fee`. Generates **MD5** signature (`merchantCode + merchantOrderId + paymentAmount + apiKey`) and sends a Duitku `inquiry`. `expiryPeriod: 60` minutes (kept in sync with the checkout countdown).
   - **Response**: `{ success: true, reference, paymentUrl?, qrString?, vaNumber?, fee, totalAmount }`

2. **`POST /api/payments/duitku/callback`**
   - **Body**: Standard Duitku callback payload (`merchantCode, amount, merchantOrderId, signature, reference, resultCode`).
   - **Description**: Verifies **HMAC-SHA256** signature (`merchantCode + amount + merchantOrderId`, keyed with `DUITKU_API_KEY`). On `resultCode '00'` updates `payments` → `paid` + `donations` → `paid` and inserts a `trackingEvents` row ("Dana Donasi Diterima") via **Firebase Admin SDK**. **Idempotent**: if payment is already `paid`, returns success without mutating. On failure (`'01'` → `failed`, otherwise `expired`) only pending records are transitioned.
   - **Response**: `{ success: true, message: 'Callback processed' }` (or `403` on invalid signature).

3. **`POST /api/payments/duitku/check-status`**
   - **Body**: `{ merchantOrderId }`
   - **Description**: Queries Duitku `transactionStatus` API (HMAC-SHA256 signature over `merchantCode + merchantOrderId`) and syncs `paid` (statusCode `00`) / `failed` (statusCode `02`) to Firestore when the local status is stale.
   - **Response**: `{ success: true, statusCode, statusMessage, reference }`

4. **`POST /api/payments/duitku/simulate-paid`** *(sandbox only)*
   - **Body**: `{ merchantOrderId }`
   - **Description**: Marks a pending payment as `paid` in one click for demo purposes. **Locked**: responds `403` unless `DUITKU_ENVIRONMENT=sandbox`. Idempotent.
   - **Response**: `{ success: true, message: 'Pembayaran disimulasikan sebagai lunas (sandbox).' }`

5. **`GET /api/payments/duitku/expire-sweep`** *(Vercel Cron)*
   - **Headers** (optional, recommended on Vercel): `Authorization: Bearer <CRON_SECRET>`
   - **Description**: Resolves donations stuck in `pending_payment` past the 60-minute expiry. Each stale donation is checked against Duitku `transactionStatus` (authoritative); `00` → `paid`, otherwise `failed`. Idempotent per record. Triggered daily at 17:00 UTC by the cron in `vercel.json`.
   - **Response**: `{ success: true, checked, paid, failed }`

### Transparency (`/api/transparency`)

1. **`GET /api/transparency/summary`**
   - **Description**: Public, read-only summary of recorded (paid) transactions via **Firebase Admin SDK** — identical for every role (guest/user/admin/partner). Never exposes donor email/phone. Payments are joined to donations by `donationId` (with `paymentId` fallback).
   - **Response**:
     ```json
     { "success": true, "data": {
         "totalReceived": 0, "totalAdminFees": 0, "totalTransactions": 0, "adminFeeRate": 0.0017,
         "disasters": [{ "disasterId": "", "disasterTitle": "", "totalCollected": 0, "donationCount": 0 }],
         "transactions": [{ "id": "", "donorName": "", "amount": 0, "adminFee": 0, "totalPaid": 0,
                            "paymentMethod": "QRIS", "paidAt": "", "disasterId": "", "disasterTitle": "",
                            "keterangan": "", "createdAt": "" }]
     }}
     ```
   - `transactions` is capped to the 100 most recent paid donations; aggregates cover all paid donations.

### Fundraising (Kolektif per Bencana) (`/api/fundraising`)

1. **`GET /api/fundraising/summary`**
   - **Description**: **SUMBER KEBENARAN progres donasi kolektif per bencana** — identik untuk semua role (guest/user/admin/partner) karena diagregasi server-side via **Firebase Admin SDK**. Angka di-derive murni dari data nyata: `donations` + `payments` berstatus `paid` (join `donationId`, fallback `paymentId`) dan `disbursements`. Karena semua jalur konfirmasi Duitku (callback/check-status/simulate-paid/expire-sweep) bersifat idempotent, agregasi **tidak mungkin dihitung ganda** oleh callback duplikat. Tidak ada donor email/phone yang diekspos. Semantik finansial (disbursed/inflight/remaining) identik dengan `DisbursementManager`.
   - **Response**:
     ```json
     { "success": true, "data": {
         "generatedAt": "", "adminFeeRate": 0.0017,
         "totals": { "collected": 0, "adminFeeTotal": 0, "donationCount": 0,
                     "disbursed": 0, "inflight": 0, "remaining": 0 },
         "disasters": [{ "disasterId": "", "disasterTitle": "", "status": "admin_approved",
                         "fundingTarget": 50000000, "partnerId": null, "partnerName": null,
                         "collected": 0, "adminFeeTotal": 0, "donationCount": 0,
                         "disbursed": 0, "inflight": 0, "remaining": 0 }]
     }}
     ```
   - Aturan per baris: `disbursed` = outflow disbursement berstatus `success`; `inflight` = `submitted`/`processing`; `remaining = max(0, collected − disbursed − inflight)`; `fundingTarget` = `disasters.fundingTarget ?? 50000000`. Donasi tanpa `disasterId` masuk bucket `__none__`, pencairan tanpa `disasterId` masuk bucket `__legacy__` (tetap dihitung di `totals`, bukan ditampilkan sebagai kartu bencana oleh frontend).

2. **`POST /api/fundraising/admin/disbursements`**
   - **Description**: Membuat **pencairan secara kolektif per bencana** — validasi saldo dilakukan **server-side** (dihitung ulang dari data nyata via Admin SDK, bukan input client). Client tidak bisa mengada-ada saldo/agregasi. Menulis **satu transaksi atomik** (Firestore `runTransaction`): `disbursements` + `partnerAllocations` (dengan `sourceDonationIds` = semua donasi paid bencana itu) + `auditLogs` + event `disbursement_created` di `disasterTimeline/{disasterId}/events`.
   - **Auth**: `Authorization: Bearer <Firebase ID Token>` + verifikasi role admin (email allowlist / `users.role == 'admin'`) → `403` tanpa token, `401` token invalid.
   - **Body**: `{ disasterId, amount, notes? }`. **Validasi**: `amount >= Rp1.000.000`, bencana ada, mitra sudah ditugaskan, `amount <= maxWithdrawable(remaining)` (nominal + biaya admin 0,17% harus muat di sisa kas).
   - **Response**: `{ success: true, data: { disbursementId, allocationId } }`.

3. **`GET /api/fundraising/report/:disasterId`**
   - **Description**: **Laporan AKHIR satu bencana** — setiap angka di-derive dari data transaksi nyata (donasi paid + fee pembayaran, pencairan, alokasi, laporan distribusi, timeline). Publik (tanpa auth). Tanpa PII donatur (hanya jumlah + jumlah donatur publik unik). Bencana tidak ditemukan → `404`.
   - **Response data**: `disasterTitle`, `status`, `fundingTarget`, `partnerName`, `summary { totalCollected, adminFeeTotal, donationCount, disbursed, inflight, remaining, donorCount, reportsTotal, reportsPublished }`, plus array `disbursements` (dengan `fee`/`totalAmount`), `allocations`, dan `timeline` (30 event terbaru).

4. **`POST /api/fundraising/admin/close`**
   - **Description**: Menutup penggalangan satu bencana → `disasters.status = 'archived'` + `archivedAt` + `auditLogs` + event timeline `fundraising_closed` (kolektif utk semua donatur), dalam satu transaksi atomik. Idempoten: jika sudah `archived`, balas `alreadyClosed: true` tanpa mutasi.
   - **Auth**: `Authorization: Bearer <Firebase ID Token>` + role admin (`403` tanpa token, `401` invalid).
   - **Body**: `{ disasterId }`. Response: `{ success: true, data: { disasterId, status: 'archived', alreadyClosed } }`.

### Admin Endpoints (`/api/admin`)

1. **`POST /api/admin/create-partner`**
   - **Headers**: `Authorization: Bearer <Firebase ID Token>`
   - **Body**: `{ email, password, name, organization, contact?, area? }`
   - **Description**: Creates a Partner account. Backend verifies the token via `adminAuth.verifyIdToken()`, then confirms the caller is an admin (email allowlist in `server/routes/admin.ts` or `role == 'admin'` in `users`). Creates the Firebase Auth user, writes `users/{uid}` with `role: 'partner'`, and creates the `partners/{uid}` profile. Passwords are never stored in Firestore.
   - **Response**: `{ success: true, partner: { ... } }` or `403` when not admin, `400` on missing fields.

2. **`POST /api/admin/reset-transactions`**
   - **Headers**: `Authorization: Bearer <ADMIN_SECRET_KEY>`
   - **Description**: Deletes all transaction data (`donations`, `payments`, `disbursements`, `partnerAllocations`, `distributionReports`, `distributions`, `trackingEvents`) in batches of 500 via the Admin SDK. For testing only.
   - **Response**: `{ success: true, message: 'Transaction data successfully reset.', deletedCount: number }`

### Image Upload — Cloudinary (`/api/images`)

1. **`POST /api/images/sign`**
   - **Headers**: `Authorization: Bearer <Firebase ID Token>` (role `admin` or `partner`)
   - **Body**: `{ folder: 'bersamakita/reports' | 'bersamakita/evidence' | 'bersamakita/partners' }`
   - **Description**: Issues a Cloudinary signed-upload signature (SHA-1 computed server-side). `CLOUDINARY_API_SECRET` never leaves the server; the browser uploads the file directly to `https://api.cloudinary.com/v1_1/<cloud>/image/upload`. Unknown folders → `400`, missing/invalid tokens → `401`.
   - **Response**: `{ success: true, data: { cloudName, apiKey, timestamp, signature, folder } }`
   - **Frontend helper**: `src/services/cloudinary.ts` → `uploadImageToCloudinary(file, folder)` returns `{ secureUrl, publicId }` (validates 5 MB max, `JPG/JPEG/PNG/WEBP`).

## External APIs

- **Firebase / Firestore**: Client-side direct access using Firebase JS SDK, protected by `firestore.rules` (see `docs/DATABASE.md`).
- **Firebase Admin SDK** (`src/config/firebase-admin.ts`): used by the backend for administrative writes (payments, donations, trackingEvents, partners, transparency, reset). Initialized from `FIREBASE_SERVICE_ACCOUNT_JSON`.
- **BMKG Open Data**: fetched server-side only (proxies above) — never called directly from the browser.
- **Duitku Direct API**: `inquiry`, `transactionStatus`, and callback webhook — backend only.
- **Cloudinary**: direct browser upload signed by `/api/images/sign` — backend only signs.