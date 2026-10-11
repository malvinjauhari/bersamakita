# Bersama Kita

Platform **crowdfunding bencana alam** untuk Indonesia: data gempa dari **BMKG** → verifikasi manual oleh Admin + penugasan **Mitra Lapangan** → penggalangan dana publik dengan pembayaran **QRIS** (Duitku Direct API) → penyaluran dana yang **transparan** ke publik.

> **Prinsip inti:** data bencana TIDAK pernah tampil otomatis ke publik. Sebuah bencana hanya tampil setelah Admin **explicitly klik APPROVE** dan menetapkan Mitra Lapangan. Tidak ada auto-approve, auto-publish, maupun placeholder. (Lihat `docs/DISASTER.md`.)

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | React 19, Vite 8, TypeScript, TailwindCSS v4, React Router 7 |
| Backend | Node.js 22, Express (modular: `server/app.ts` + `server/routes/`) |
| Database & Auth | Firebase Auth (client), Firestore, Firebase Admin SDK (server) |
| Payment | Duitku Direct API — QRIS only (`SP`) |
| Eksternal | BMKG Open Data, Cloudinary (image hosting) |
| Deploy | Vercel (serverless `api/index.ts` + static `dist/`) |

## Fitur Utama

- **Disaster Management (BMKG)**: fetch `autogempa` / `gempaterkini` via proxy backend, review & verifikasi manual oleh Admin, wajib assign Mitra Lapangan, status `pending_verification` → `admin_approved`.
- **Donasi QRIS**: biaya admin transparan **0,17%** (single source of truth di `src/lib/fees.ts`), checkout menampilkan `qrString` Duitku, callback idempoten dengan signature **HMAC-SHA256**.
- **Transparansi**: `GET /api/transparency/summary` menampilkan riwayat dana masuk + aggregasi per bencana untuk semua role (tanpa melonggarkan `firestore.rules`).
- **Partner (Mitra Lapangan)**: akun partner hanya bisa dibuat Admin melalui `POST /api/admin/create-partner` (verifyIdToken + cek role admin).
- **Penyaluran & Pencairan**: distribusi, laporan penyaluran dengan bukti foto (Cloudinary), pencairan dana dengan minimal Rp1.000.000 (+ biaya admin).
- **Peta Indonesia**: peta SVG interaktif untuk katalog gempa & posko bencana.

## Struktur Proyek (Feature-Driven)

```text
src/
├── components/            # UI bersama (layout, feedback, landing)
├── config/                # Konfigurasi Firebase client & admin
├── features/              # Modul fitur per domain
│   ├── auth/              # Login user, konteks auth & role
│   ├── admin/             # Portal & otentikasi Admin
│   ├── partner/           # Auth & dashboard Mitra Lapangan
│   ├── disaster/          # Katalog BMKG, peta, verifikasi, analisis situasi
│   ├── donation/          # Donasi, checkout QRIS, status, riwayat
│   ├── distribution/      # Laporan penyaluran & transparansi
│   ├── finance/           # Admin transaksi, pencairan, setelan Duitku
│   ├── operations/        # Audit logs
│   └── public/            # Halaman statis (FAQ, kontak, kebijakan)
├── lib/                   # Utilitas bersama (fees, firestore-errors, utils)
├── services/              # Integrasi eksternal
│   ├── firebase/          # auth, firestore, seed
│   ├── bmkg.ts
│   ├── duitku.ts          # DuitkuPaymentService (client helper)
│   └── cloudinary.ts      # Upload signature + validasi gambar
├── types/                 # TypeScript types (sinkron dgn Firestore)
├── App.tsx                # Routing utama
└── main.tsx

server/
├── app.ts                 # Entry point Express + mount routes
└── routes/
    ├── bmkg.ts            # Proxy BMKG (autogempa, gempaterkini)
    ├── payments.ts        # create, callback, check-status, simulate-paid, expire-sweep
    ├── transparency.ts    # GET /summary
    ├── admin.ts           # create-partner, reset-transactions
    └── images.ts          # POST /sign (Cloudinary signed upload)

api/index.ts               # Vercel serverless entry (export `app`)
```

## Menjalankan Lokal

**Prasyarat:** Node.js 22.x.

```bash
npm install
cp .env.example .env      # isi semua nilai (lihat tabel di bawah)
npm run dev               # Express + Vite middleware → http://localhost:3005
```

Script lain:
- `npm run build` — build Vite ke `dist/`
- `npm run start` — production-like server lokal (`NODE_ENV=production tsx server/app.ts`)
- `npm run lint` — type-check (`tsc --noEmit`)

### Environment Variables (.env)

| Variabel | Prefix | Kegunaan |
|---|---|---|
| `VITE_FIREBASE_*` | Frontend | Konfigurasi Firebase JS SDK |
| `VITE_APP_URL` | Frontend | Base URL (dev: `http://localhost:3005`) |
| `PORT`, `APP_URL` | Backend | Port & base URL untuk callback/return Duitku |
| `DUITKU_MERCHANT_CODE`, `DUITKU_API_KEY` | Backend | Kredensial Duitku — **jangan pernah diekspos ke frontend** |
| `DUITKU_ENVIRONMENT` | Backend | `sandbox` (default) atau `production` |
| `ADMIN_SECRET_KEY` | Backend | Guard `POST /api/admin/reset-transactions` |
| `CRON_SECRET` | Backend | Guard `GET /api/payments/duitku/expire-sweep` (Vercel Cron) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Backend | Service account Firestore (Admin SDK), JSON satu baris |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Backend | Tanda tangan upload Cloudinary |

> **Aturan keamanan:** variabel backend **tanpa** prefix `VITE_` agar tidak bocor ke bundle React.

## Deploy ke Vercel

- `vercel.json` : framework `vite`, output `dist/`, rewrite `/api/:path*` → serverless function, plus cron **`GET /api/payments/duitku/expire-sweep`** setiap hari pukul 17:00 UTC.
- Jalankan: `npx vercel deploy --prod` (pastikan env di atas sudah di-set di project Vercel, termasuk `CRON_SECRET`).

## Dokumentasi Lengkap

Dokumentasi detail ada di folder `docs/`:

| Dokumen | Isi |
|---|---|
| `ARCHITECTURE.md` | Arsitektur sistem & diagram alur |
| `API.md` | Spesifikasi endpoint backend |
| `AUTH.md` | Otentikasi & otorisasi per role |
| `DISASTER.md` | Alur verifikasi BMKG → ACTIVE (business rules) |
| `DATABASE.md` | Skema Firestore & aturan akses |
| `PAYMENT.md` | Integrasi Duitku QRIS + fee 0,17% |
| `PARTNER.md` | Manajemen Mitra Lapangan |
| `CONTRACT.md` | Kontrak/perjanjian teknis yang tidak boleh dilanggar |
| `TROUBLESHOOTING.md` | Error log & pelajaran penting |
| `TASKS.md` | Status isu & rekomendasi |
| `NOW.md` | Snapshot status proyek terkini |
| `CHANGELOG.md` | Riwayat perubahan |