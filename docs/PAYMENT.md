# Payment Gateway Integration (Duitku)

## Overview
The application uses Duitku (Sandbox) for processing donations directly via the Duitku Direct API.

## Architecture

1. **Initiation (Frontend)**: User initiates a donation on `/transaction/donate/:disasterId` and selects a payment method (QRIS or DANA).
2. **Creation (Backend)**: `PaymentService` (`src/integrations/duitku/payment-service.ts`) calls `/api/payments/duitku/create` with `paymentMethod` (`SP` for QRIS, `DA` for DANA).
3. **Duitku API**: Backend generates an MD5 signature (`merchantCode + merchantOrderId + paymentAmount + apiKey`) and sends a `POST` request to Duitku Sandbox `inquiry` endpoint.
4. **Checkout (Frontend)**: Backend returns `qrString` (for QRIS) or `paymentUrl` (for E-Money). The frontend displays the QR code or redirects the user. The checkout page checks the transaction status via `/api/payments/duitku/check-status`.
5. **Callback (Backend)**: Duitku sends a webhook to `/api/payments/duitku/callback` when payment is completed.
   - The backend validates the **HMAC-SHA256** signature.
   - It performs an idempotency check.
   - It updates the Firestore `payments` and `donations` documents directly via the Firebase Admin SDK.
6. **Return URL**: User is redirected back to `/transaction/status/:donationId` after successful payment.

## Supported Payment Methods
- **ShopeePay QRIS (SP)**
- **DANA (DA)**

## Environment Variables Needed
- `DUITKU_MERCHANT_CODE`
- `DUITKU_API_KEY`
- `DUITKU_ENVIRONMENT` ('sandbox' or 'production', Default: 'sandbox')
- `APP_URL` (For callback and return URLs, Default: 'http://localhost:3005')
