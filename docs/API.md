# API Integration Specifications

This document outlines the API endpoints provided by `server.ts` and external API usage.

## Internal Backend APIs (`server.ts`)

### BMKG Proxy & Verification
1. **`GET /api/bmkg/autogempa`**
   - **Description**: Proxies `https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json`
   - **Response**: `{ success: true, data: { ... } }` or `{ success: false, message: '...' }`

2. **`GET /api/bmkg/gempaterkini`**
   - **Description**: Proxies `https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json`
   - **Response**: `{ success: true, data: { ... } }` or `{ success: false, message: '...' }`

3. **`POST /api/bmkg/auto-verify`**
   - **Body**: `{ eventTime, ingestionTime, magnitude, force24h }`
   - **Description**: Evaluates if a BMKG event should be automatically approved (e.g. > 24 hours without admin action).
   - **Response**: `{ success: true, isAutoApproved: boolean, reason: string, ... }`

### Duitku Payment Gateway
1. **`POST /api/payments/duitku/create`**
   - **Body**: `{ donationId, amount, donorName, donorEmail, donorPhone, paymentMethod }` — `amount` = **nominal donasi**; `paymentMethod` must be `'SP'` (QRIS) or omitted (defaults to QRIS).
   - **Description**: Creates a Duitku inquiry/invoice. Computes the transparent 0,17% admin fee server-side (`src/lib/fees.ts`) and charges `paymentAmount = amount + fee`. Generates MD5 signature for the inquiry.
   - **Response**: `{ success: true, reference: string, paymentUrl?: string, qrString?: string, vaNumber?: string, fee: number, totalAmount: number }`

2. **`POST /api/payments/duitku/callback`**
   - **Body**: Standard Duitku callback payload.
   - **Description**: Receives payment notifications from Duitku. Verifies HMAC-SHA256 signature. Updates Firestore directly using Firebase Admin SDK.
   - **Response**: `{ success: true, message: 'Callback processed' }`

3. **`POST /api/payments/duitku/check-status`**
   - **Body**: `{ merchantOrderId }`
   - **Description**: Queries Duitku transactionStatus API to get current payment status. Verifies using HMAC-SHA256 signature. Updates Firestore if status is paid or failed.
   - **Response**: `{ success: true, statusCode: string, statusMessage: string, reference: string }`

### Transparency
1. **`GET /api/transparency/summary`**
   - **Description**: Public, read-only summary of recorded (paid) transactions via Firebase Admin SDK — identical for every role (guest/user/admin/partner). Never exposes donor email/phone.
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

### Admin Endpoints
1. **`POST /api/admin/reset-transactions`**
   - **Headers**: `Authorization: Bearer <ADMIN_SECRET_KEY>`
   - **Description**: Deletes all transaction data (donations, payments, etc.) for testing purposes.
   - **Response**: `{ success: true, deletedCount: number }`

### Image Upload (Cloudinary)
1. **`POST /api/images/sign`**
   - **Headers**: `Authorization: Bearer <Firebase ID Token>` (role `admin` or `partner`)
   - **Body**: `{ folder: 'bersamakita/reports' | 'bersamakita/evidence' | 'bersamakita/partners' }`
   - **Description**: Issues a Cloudinary signed-upload signature (SHA-1 computed server-side). `CLOUDINARY_API_SECRET` never leaves the server and the browser uploads the file directly to `https://api.cloudinary.com/v1_1/<cloud>/image/upload`. Unknown folders are rejected with `400`, missing/invalid tokens with `401`.
   - **Response**: `{ success: true, data: { cloudName, apiKey, timestamp, signature, folder } }`
   - **Frontend helper**: `src/integrations/cloudinary/upload.ts` → `uploadImageToCloudinary(file, folder)` returns `{ secureUrl, publicId }`.

## External APIs
- **Firebase / Firestore**: Client-side direct access using Firebase JS SDK, protected by `firestore.rules`.
