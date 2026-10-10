# Payment Gateway Integration (Duitku)

## Overview
The application uses Duitku (Sandbox) for processing donations directly via the Duitku Direct API. **QRIS is the only supported payment method.**

## Transparent Admin Fee (0,17%)
All fee calculations live in **one place**: `src/lib/fees.ts` (`ADMIN_FEE_RATE = 0.0017`, `calculateAdminFee()`, `calculateTotalPayment()`), shared by frontend and backend so every displayed number stays in sync.

```text
Biaya Admin     = Nominal Donasi × 0,17%
Total Dibayar   = Nominal Donasi + Biaya Admin

Contoh: Donasi Rp100.000 → Biaya Admin Rp170 → Total Dibayar Rp100.170
```

- The fee is charged **on top of** the donation: `paymentAmount` sent to Duitku = nominal + fee.
- `donations.amount` stays the **nominal donation** (dana penggalangan tetap utuh).
- `payments.fee` stores the admin fee separately; `payments.paidAmount` = total actually paid (rewritten from gateway values on callback/check-status).
- The fee breakdown is shown before payment (`TransactionDonatePage`, `TransactionCheckoutPage`) and in the public transaction history on the Transparansi Penyaluran page.

## Architecture

1. **Initiation (Frontend)**: User initiates a donation on `/transaction/donate/:disasterId`. QRIS is the only method (no other options in UI or API).
2. **Creation (Backend)**: `PaymentService` (`src/integrations/duitku/payment-service.ts`) calls `/api/payments/duitku/create`. The backend computes the 0,17% fee server-side, then calls Duitku with `paymentMethod: 'SP'` and `paymentAmount = amount + fee`.
3. **Duitku API**: Backend generates an MD5 signature (`merchantCode + merchantOrderId + paymentAmount + apiKey`) and sends a `POST` request to Duitku Sandbox `inquiry` endpoint.
4. **Checkout (Frontend)**: Backend returns `qrString` with `fee` and `totalAmount`. The checkout page shows the fee breakdown and checks the transaction status via `/api/payments/duitku/check-status`.
5. **Callback (Backend)**: Duitku sends a webhook to `/api/payments/duitku/callback` when payment is completed.
   - The backend validates the **HMAC-SHA256** signature.
   - It performs an idempotency check.
   - It updates the Firestore `payments` and `donations` documents directly via the Firebase Admin SDK.
6. **Return URL**: User is redirected back to `/transaction/status/:donationId` after successful payment.

## Supported Payment Methods
- **QRIS only** — Duitku code `SP` (ShopeePay QRIS). Any other method (`DA`, `SA`) is rejected with `400 "Metode pembayaran tidak didukung. Hanya QRIS."`

## Environment Variables Needed
- `DUITKU_MERCHANT_CODE`
- `DUITKU_API_KEY`
- `DUITKU_ENVIRONMENT` ('sandbox' or 'production', Default: 'sandbox')
- `APP_URL` (For callback and return URLs, Default: 'http://localhost:3005')
