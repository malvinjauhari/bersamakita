# Grafik Dependensi Modul (Implementation Dependency Graph)

Dokumen ini memetakan seluruh modul dan subsistem dalam platform **Bersama Kita** ke dalam arsitektur bertingkat (*layered architecture*). Dokumen ini menjelaskan ketergantungan antar-modul secara eksplisit untuk menjamin bahwa tidak ada komponen yang diimplementasikan sebelum dependensi dasarnya siap.

---

## 1. Diagram Ketergantungan Modul (Mermaid Diagram)

```mermaid
graph TD
    %% Layer 0: Tooling & Config
    L0_PKG["package.json & tsconfig.json"] --> L0_ENV[".env & vite.config.ts"]
    
    %% Layer 1: Core Types & Security
    L0_ENV --> L1_TYPES["src/types/index.ts<br/>(Core Contracts & Interfaces)"]
    L1_TYPES --> L1_FEES["src/lib/fees.ts<br/>(0.17% Fee & Outflow Formula)"]
    L1_TYPES --> L1_RULES["firestore.rules<br/>(RBAC, Isolation, Quarantine)"]
    
    %% Layer 2: Backend & Database Config
    L1_RULES --> L2_FB_CLIENT["src/config/firebase.ts<br/>(Firebase Client SDK)"]
    L1_RULES --> L2_FB_ADMIN["src/config/firebase-admin.ts<br/>(Firebase Admin SDK)"]
    L2_FB_ADMIN --> L2_EXPRESS["server/app.ts<br/>(Express Server & Vite Middleware)"]
    
    %% Layer 3: Authentication & Session
    L2_FB_CLIENT --> L3_AUTH_SRV["src/services/firebase/auth.ts<br/>(Google Auth & User Sync)"]
    L3_AUTH_SRV --> L3_AUTH_CTX["src/features/auth/AuthContext.tsx<br/>(User vs Staff Session Isolation)"]
    
    %% Layer 4: Design System & UI Shell
    L3_AUTH_CTX --> L4_UI["src/index.css & Layout Shell<br/>(WideNavbar, WideFooter, Toast)"]
    
    %% Layer 5: BMKG Ingestion & Disaster Quarantine
    L2_EXPRESS --> L5_BMKG_SRV["server/routes/bmkg.ts<br/>(BMKG Proxy & Server Refresh)"]
    L4_UI --> L5_DISASTER_CARD["src/features/disaster/BMKGVerificationCard.tsx<br/>(Admin Review & Quarantine Gate)"]
    L5_BMKG_SRV --> L5_DISASTER_CARD
    
    %% Layer 6: Partner Management & Mandatory Assignment
    L2_FB_ADMIN --> L6_PARTNER_API["server/routes/admin.ts<br/>(POST /api/admin/create-partner)"]
    L6_PARTNER_API --> L6_PARTNER_VIEW["src/features/partner/AdminPartnersView.tsx"]
    L6_PARTNER_VIEW --> L5_DISASTER_CARD
    L5_DISASTER_CARD --> L6_PUBLIC_DASH["src/features/disaster/WideDisasterDashboard.tsx<br/>(Only 'admin_approved' Disasters)"]
    
    %% Layer 7: Donation & Duitku QRIS Payment Gateway
    L1_FEES --> L7_PAYMENT_API["server/routes/payments.ts<br/>(Duitku Direct API 'SP' & HMAC Callback)"]
    L6_PUBLIC_DASH --> L7_DONATE_PAGE["src/features/donation/TransactionDonatePage.tsx"]
    L7_DONATE_PAGE --> L7_CHECKOUT_PAGE["src/features/donation/TransactionCheckoutPage.tsx<br/>(QRIS Render & Auto Polling)"]
    L7_PAYMENT_API --> L7_CHECKOUT_PAGE
    L7_PAYMENT_API --> L7_STATUS_PAGE["src/features/donation/TransactionStatusPage.tsx"]
    
    %% Layer 8: Financial Ledger & Atomic Disbursement
    L7_PAYMENT_API --> L8_FUNDRAISING_API["server/routes/fundraising.ts<br/>(/summary & Atomic db.runTransaction)"]
    L8_FUNDRAISING_API --> L8_DISBURSE_MGR["src/features/finance/DisbursementManager.tsx<br/>(Admin Fund Outflow Panel)"]
    
    %% Layer 9: Field Logistics & 6-Milestone Stepper
    L2_FB_ADMIN --> L9_IMAGE_API["server/routes/images.ts<br/>(Signed Cloudinary Token)"]
    L9_IMAGE_API --> L9_CLOUDINARY_SRV["src/services/cloudinary.ts<br/>(Direct CDN Upload)"]
    L8_DISBURSE_MGR --> L9_PARTNER_DASH["src/features/partner/PartnerDashboardView.tsx<br/>(Fund Receipt Confirmation)"]
    L9_CLOUDINARY_SRV --> L9_STEPPER["src/features/distribution/DistributionProgressCard.tsx<br/>(6-Stage Logistics Stepper)"]
    L9_PARTNER_DASH --> L9_STEPPER
    
    %% Layer 10: Collective Timeline & Final LPJ
    L9_STEPPER --> L10_TIMELINE["src/features/distribution/DisasterTimelineSection.tsx<br/>(Public Collective Timeline)"]
    L8_FUNDRAISING_API --> L10_FINAL_REPORT["src/features/distribution/FinalReportSection.tsx<br/>(Audited Accountability Report / LPJ)"]
    L10_TIMELINE --> L10_ARCHIVE["src/features/distribution/TransparansiReportsPage.tsx<br/>(Closed & Archived Posko)"]
    
    %% Layer 11: Deployment & Production Hardening
    L10_ARCHIVE --> L11_VERCEL["vercel.json & api/index.ts<br/>(Serverless Deployment)"]
    L1_RULES --> L11_FIREBASE_DEPLOY["firestore.indexes.json<br/>(Production Security & Indexes)"]
```

---

## 2. Analisis Tingkatan Arsitektur (Layer-by-Layer Architectural Breakdown)

### Layer 0: Tooling & Environment
- **Modul**: `package.json`, `tsconfig.json`, `vite.config.ts`, `.env.example`.
- **Peran**: Menjamin keselarasan engine kompilasi, pustaka dependensi, dan variabel lingkungan.
- **Mengapa Harus Pertama?**: Tanpa konfigurasi compiler dan module resolution yang valid, berkas TypeScript tidak dapat dikompilasi atau diuji.

---

### Layer 1: Core Types, Data Contracts & Security Rules
- **Modul**: `src/types/index.ts`, `src/lib/fees.ts`, `src/lib/firestore-errors.ts`, `firestore.rules`.
- **Peran**: Menetapkan kontrak tipe data terpusat, rumus biaya 0,17%, dan aturan deklaratif Firestore.
- **Mengapa Mendahului Backend & Frontend?**:
  * Seluruh endpoint Express dan komponen React mengimpor antarmuka dari `src/types/index.ts`.
  * `firestore.rules` wajib aktif sebelum kode frontend dijalankan agar tidak terjadi celah kebocoran data donasi privat selama proses pengujian.

---

### Layer 2: Backend Infrastructure & Database SDKs
- **Modul**: `src/config/firebase.ts`, `src/config/firebase-admin.ts`, `server/app.ts`, `api/index.ts`.
- **Peran**: Menyediakan koneksi database klien dan admin, serta server Express monolitik.
- **Mengapa Mendahului Fitur Bisnis?**:
  * Autentikasi dan operasi penulisan data memerlukan instance `auth`, `db`, dan `adminDb` yang terinisialisasi secara benar.
  * Polyfill `Referer` di `server/app.ts` harus aktif agar pemanggilan Firebase di lingkungan Node.js tidak ditolak oleh pembatasan API key.

---

### Layer 3: Authentication, Session Management & RBAC
- **Modul**: `src/services/firebase/auth.ts`, `src/lib/safe-storage.ts`, `src/features/auth/AuthContext.tsx`.
- **Peran**: Mengelola sesi Donatur (Google Auth) dan Staf (Admin & Mitra) secara terisolasi.
- **Mengapa Mendahului Halaman UI?**:
  * Tampilan navigasi dan kontrol akses rute (`PrivateRoute`) memerlukan status `isAdminAuthenticated` atau `isPartnerAuthenticated`.
  * Mencegah bug *permission denied* akibat residu token sesi lama di browser.

---

### Layer 4: Design System, UI Shell & Shared Feedback
- **Modul**: `src/index.css`, `src/lib/utils.ts`, `WideNavbar.tsx`, `WideFooter.tsx`, `Toast.tsx`, `Skeleton.tsx`.
- **Peran**: Menyediakan kerangka visual, sistem notifikasi, dan penanganan status pemuatan data.
- **Mengapa Mendahului Fitur Spesifik?**:
  * Semua halaman fitur dibangun di dalam shell navigasi ini dan menggunakan Toast untuk menampilkan umpan balik aksi pengguna.

---

### Layer 5: Disaster Data, BMKG Proxy & Quarantine Logic
- **Modul**: `src/services/bmkg.ts`, `server/routes/bmkg.ts`, `BMKGVerificationCard.tsx`.
- **Peran**: Ingesti data seismik dari BMKG dan karantina otomatis ke status `pending_verification`.
- **Mengapa Mendahului Alur Donasi?**:
  * Donasi tidak dapat dibuka tanpa adanya entitas bencana terverifikasi yang menjadi tujuan penyaluran bantuan.
  * Menjamin kepatuhan pada aturan mutlak: **data BMKG tidak pernah otomatis dipublikasikan**.

---

### Layer 6: Partner Management & Mandatory Assignment
- **Modul**: `server/routes/admin.ts`, `AdminPartnersView.tsx`, `WideDisasterDashboard.tsx`.
- **Peran**: Pembuatan akun mitra lapangan oleh admin dan penugasan wajib (*mandatory assignment*) sebelum bencana disetujui.
- **Mengapa Mendahului Donasi?**:
  * Bencana yang aktif di katalog wajib memiliki field `partnerId` dan `partnerName` yang valid agar alur penyaluran dana nantinya tidak mandek.

---

### Layer 7: QRIS Payment Gateway, Invoicing & Webhook Idempotency
- **Modul**: `server/routes/payments.ts`, `TransactionDonatePage.tsx`, `TransactionCheckoutPage.tsx`, `TransactionStatusPage.tsx`.
- **Peran**: Fasilitasi pembayaran donasi QRIS Duitku Direct API, verifikasi HMAC-SHA256, dan pencegahan duplikasi saldo.
- **Mengapa Bergantung pada Layer 5 & 6?**:
  * Transaksi donasi wajib mengikat ID bencana (`disasterId`) dan judul bencana terverifikasi.
  * Mutasi status donasi menjadi `paid` menjadi prasyarat pembentukan saldo kas bencana.

---

### Layer 8: Financial Ledger & Atomic Disbursement Engine
- **Modul**: `server/routes/fundraising.ts` (`/summary` & `/admin/disbursements`), `DisbursementManager.tsx`.
- **Peran**: Otorisasi pencairan dana dari saldo terkumpul menggunakan `db.runTransaction()`.
- **Mengapa Bergantung pada Layer 7?**:
  * Kas yang dicairkan bersumber secara nyata dari agregasi transaksi donasi yang telah berstatus `paid`.
  * Formula pencairan memvalidasi saldo kas terkumpul sebelum mengizinkan pengeluaran.

---

### Layer 9: Field Logistics, 6-Milestone Stepper & Signed Cloudinary Media
- **Modul**: `server/routes/images.ts`, `src/services/cloudinary.ts`, `PartnerDashboardView.tsx`, `DistributionProgressCard.tsx`.
- **Peran**: Konfirmasi penerimaan dana oleh mitra dan pembaruan 6 tahapan distribusi bantuan berbukti foto.
- **Mengapa Bergantung pada Layer 8?**:
  * Mitra hanya dapat memulai proses distribusi logistik setelah admin menyetujui pencairan dana dan mengalokasikannya ke ID mitra tersebut.

---

### Layer 10: Collective Public Timeline & Final Accountability Reporting (LPJ)
- **Modul**: `DisasterTimelineSection.tsx`, `FinalReportSection.tsx`, `TransparansiReportsPage.tsx`, `AdminFinalReportPanel.tsx`.
- **Peran**: Menampilkan garis waktu kronologis bantuan tanpa membocorkan data pribadi donatur, penutupan posko, dan publikasi LPJ final.
- **Mengapa Berada di Tingkat Akhir?**:
  * Timeline dan LPJ merangkum seluruh event dari transaksi donasi, pencairan dana, hingga bukti serah terima logistik di posko.

---

### Layer 11: Deployment, Production Hardening & E2E Validation
- **Modul**: `vercel.json`, `api/index.ts`, `firestore.indexes.json`.
- **Peran**: Konfigurasi serverless deployment di Vercel dan optimasi query komposit di Firestore.
- **Mengapa Paling Terakhir?**:
  * Deployment produksi dilakukan setelah seluruh komponen dan rute API teruji secara lokal tanpa error tipe data atau kebocoran keamanan.
