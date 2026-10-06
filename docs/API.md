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
   - **Body**: `{ donationId, amount, donorName, donorEmail, donorPhone, paymentMethod }`
   - **Description**: Creates a Duitku inquiry/invoice and returns the payment URL and/or QR String. Generates MD5 signature for the inquiry.
   - **Response**: `{ success: true, reference: string, paymentUrl?: string, qrString?: string, vaNumber?: string }`

2. **`POST /api/payments/duitku/callback`**
   - **Body**: Standard Duitku callback payload.
   - **Description**: Receives payment notifications from Duitku. Verifies HMAC-SHA256 signature. Updates Firestore directly using Firebase Admin SDK.
   - **Response**: `{ success: true, message: 'Callback processed' }`

3. **`POST /api/payments/duitku/check-status`**
   - **Body**: `{ merchantOrderId }`
   - **Description**: Queries Duitku transactionStatus API to get current payment status. Verifies using HMAC-SHA256 signature. Updates Firestore if status is paid or failed.
   - **Response**: `{ success: true, statusCode: string, statusMessage: string, reference: string }`

### Admin Endpoints
1. **`POST /api/admin/reset-transactions`**
   - **Headers**: `Authorization: Bearer <ADMIN_SECRET_KEY>`
   - **Description**: Deletes all transaction data (donations, payments, etc.) for testing purposes.
   - **Response**: `{ success: true, deletedCount: number }`

## External APIs
- **Firebase / Firestore**: Client-side direct access using Firebase JS SDK, protected by `firestore.rules`.
