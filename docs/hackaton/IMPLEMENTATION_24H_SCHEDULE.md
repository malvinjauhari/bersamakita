# Jadwal Eksekusi Hackathon 24 Jam (24-Hour Hackathon Schedule)

Dokumen ini memuat rencana kerja terperinci selama 24 jam untuk merekonstruksi dan mendemonstrasikan platform **Bersama Kita** dalam kompetisi hackathon nasional. Jadwal ini dirancang secara realistis dengan membagi tim ke dalam dua jalur paralel (*Track Frontend & UI/UX* dan *Track Backend & External Integrations*), menyematkan alokasi waktu cadangan (*contingency buffers*), serta menyediakan rencana mitigasi darurat (*fallback plan*).

---

## 1. Ringkasan Pembagian Waktu (Timeline Milestones)

```
[00:00 - 02:00] Fase 1: Inisialisasi, Tooling & Fondasi Monorepo (2 Jam)
[02:00 - 04:30] Fase 2: Schema Data, Firestore Security Rules & Auth Context (2.5 Jam)
[04:30 - 08:30] Fase 3: Ingesti BMKG, Karantina Bencana & Portal Admin (4 Jam)
[08:30 - 13:00] Fase 4: Integrasi Gateway QRIS Duitku & Checkout Transaksi (4.5 Jam)
[13:00 - 16:30] Fase 5: Disbursement Manager & Portal Mitra 6 Milestone (3.5 Jam)
[16:30 - 19:30] Fase 6: Timeline Kolektif Publik & Laporan LPJ Final (3 Jam)
[19:30 - 21:30] Fase 7: Pengujian End-to-End, QA Skrip & Perbaikan Bug (2 Jam)
[21:30 - 22:45] Fase 8: Deployment Produksi (Vercel + Firebase) (1.25 Jam)
[22:45 - 24:00] Fase 9: Persiapan Demo Interaktif & Pitch Rehearsal (1.25 Jam)
```

---

## 2. Rincian Eksekusi Jam demi Jam (Hour-by-Hour Execution Plan)

### Jam 00:00 – 02:00 (Fase 1: Inisialisasi, Tooling & Fondasi Monorepo)
- **Tujuan**: Menghidupkan lingkungan pengembangan fullstack yang bersih dan siap pakai.
- **Aktivitas Paralel**:
  - *Track Backend/DevOps*:
    * Setup `package.json`, install dependensi (`express`, `firebase`, `firebase-admin`, `tsx`).
    * Setup `server/app.ts` dengan polyfill referer header dan dev Vite middleware.
    * Konfigurasi `.env` lokal dengan kredensial sandbox (Firebase, Duitku, Cloudinary).
  - *Track Frontend*:
    * Setup `vite.config.ts`, `tsconfig.json`, dan Tailwind CSS v4 di `src/index.css`.
    * Membangun komponen dasar: `Toast.tsx`, `Skeleton.tsx`, dan `HackathonBanner.tsx`.
- **Milestone 1**: Server berjalan di `http://localhost:3005`, Vite dev middleware aktif, Tailwind v4 ter-render tanpa kendala.

---

### Jam 02:00 – 04:30 (Fase 2: Schema Data, Security Rules & Autentikasi)
- **Tujuan**: Menetapkan kontrak tipe data, aturan isolasi database Firestore, dan autentikasi multi-peran.
- **Aktivitas Paralel**:
  - *Track Backend/Data*:
    * Finalisasi `src/types/index.ts` dan fungsi kalkulasi biaya di `src/lib/fees.ts`.
    * Penulisan `firestore.rules`: default deny, isolasi donasi privat, dan karantina data BMKG.
    * Inisialisasi `src/config/firebase-admin.ts`.
  - *Track Frontend*:
    * Implementasi `src/services/firebase/auth.ts` (Google Auth Client & User Sync).
    * Implementasi `src/features/auth/AuthContext.tsx` dengan pemisahan sesi User vs Staf.
    * Pembangunan antarmuka: `UserLoginPage.tsx`, `AdminAuthPage.tsx`, dan `PartnerAuthPage.tsx`.
- **Milestone 2**: Pengguna dapat login dengan Google; admin dan mitra dapat login via sesi staf; pengujian aturan Firestore menolak akses ilegal.

---

### Jam 04:30 – 08:30 (Fase 3: Ingesti BMKG, Karantina & Verifikasi Admin)
- **Tujuan**: Membangun pintu gerbang penarikan data seismik BMKG dan portal persetujuan bencana admin dengan penugasan mitra wajib.
- **Aktivitas Paralel**:
  - *Track Backend*:
    * Implementasi parser `src/services/bmkg.ts` dan route `server/routes/bmkg.ts` (`/autogempa`, `/refresh`).
    * Implementasi pembuatan mitra di `server/routes/admin.ts` (`POST /api/admin/create-partner`).
  - *Track Frontend*:
    * Pembuatan `src/features/disaster/BMKGVerificationCard.tsx` (kartu telaah dengan tombol persetujuan terkunci sebelum mitra dipilih).
    * Pembuatan `src/features/partner/AdminPartnersView.tsx` (tabel dan pendaftaran mitra lapangan).
    * Pembuatan `src/features/disaster/WideDisasterDashboard.tsx` (katalog publik dengan filter `admin_approved`).
- **Milestone 3**: Tombol refresh BMKG menarik data ke status `pending_verification`; admin dapat mendaftarkan mitra dan menugaskannya sebelum menyetujui bencana agar tampil di katalog donatur.

---

### Jam 08:30 – 13:00 (Fase 4: Integrasi Gateway QRIS Duitku & Checkout)
- **Tujuan**: Menghadirkan alur transaksi donasi instan melalui QRIS nasional dengan kalkulasi biaya transparan dan penanganan webhook yang aman.
- **Aktivitas Paralel*:
  - *Track Backend*:
    * Implementasi `server/routes/payments.ts`:
      - `/create`: request inquiry ke sandbox Duitku Direct API (metode `SP`), hitung fee 0,17%.
      - `/callback`: verifikasi signature HMAC-SHA256, **idempotency guard** (abaikan callback jika status sudah `paid`), dan batch Firestore update via Admin SDK.
      - `/check-status`: background status checker.
  - *Track Frontend*:
    * Implementasi `src/features/donation/TransactionDonatePage.tsx` (input nominal + rincian biaya).
    * Implementasi `src/features/donation/TransactionCheckoutPage.tsx` (render QRIS dari `qrString`, hitung mundur 60 menit, dan polling status).
    * Implementasi `src/features/donation/TransactionStatusPage.tsx` dan `MyDonationsPage.tsx`.
- **Milestone 4 (Critical Milestone)**: Donatur dapat memilih bencana, memindai kode QRIS di sandbox, menerima callback sukses tanpa duplikasi saldo, dan melihat tanda terima transaksi.

---

### Jam 13:00 – 16:30 (Fase 5: Disbursement Manager & Portal Mitra 6 Milestone)
- **Tujuan**: Membangun mekanisme pencairan dana bantuan berbasis transaksi atomik dan antarmuka operasional mitra posko bencana.
- **Aktivitas Paralel*:
  - *Track Backend*:
    * Implementasi `server/routes/fundraising.ts` (`/summary` dan `POST /admin/disbursements` berbasis `db.runTransaction()`).
    * Implementasi tanda tangan unggah media di `server/routes/images.ts` (`POST /api/images/sign`).
  - *Track Frontend*:
    * Implementasi `src/services/cloudinary.ts` (upload file dengan indikator persentase progres).
    * Implementasi `src/features/finance/DisbursementManager.tsx` (panel pencairan dana admin).
    * Implementasi `src/features/partner/PartnerDashboardView.tsx` dan `DistributionProgressCard.tsx` (konfirmasi terima dana dan pembaruan 6 milestone berbukti foto).
- **Milestone 5**: Admin dapat mencairkan dana dari kas terkumpul; mitra dapat mengonfirmasi penerimaan dan mengunggah foto logistik posko ke Cloudinary.

---

### Jam 16:30 – 19:30 (Fase 6: Timeline Kolektif Publik & Laporan LPJ Final)
- **Tujuan**: Menghubungkan seluruh data distribusi ke dalam garis waktu publik dan memfasilitasi penutupan kampanye.
- **Aktivitas Paralel*:
  - *Track Backend*:
    * Endpoint `server/routes/fundraising.ts` (`/report/:disasterId` dan `POST /admin/close`).
  - *Track Frontend*:
    * Implementasi `src/features/distribution/DisasterTimelineSection.tsx` (garis waktu kronologis publik).
    * Implementasi `src/features/distribution/AdminFinalReportPanel.tsx` (audit akhir penutupan kampanye).
    * Implementasi `src/features/distribution/FinalReportSection.tsx` dan `TransparansiReportsPage.tsx`.
- **Milestone 6**: Publik dapat memantau garis waktu bantuan; admin dapat menutup kampanye (`archived`) dan menerbitkan Laporan Pertanggungjawaban (LPJ) lengkap.

---

### Jam 19:30 – 21:30 (Fase 7: Pengujian End-to-End, QA Skrip & Bug Fixes)
- **Tujuan**: Menemukan dan memperbaiki seluruh galat logika, tampilan yang patah, atau respons yang lambat.
- **Aktivitas Tim Terpadu**:
  * Jalankan simulasi penuh alur donasi hingga pelaporan.
  * Uji responsivitas antarmuka pada perangkat ponsel nyata dan simulasi jaringan lambat (*Slow 3G*).
  * Jalankan audit kode: `npm run lint` (`tsc --noEmit`).
  * Periksa console log untuk memastikan tidak ada unhandled promise rejections atau kebocoran memori.
- **Milestone 7**: Zero critical bugs; alur dari ingesti data hingga LPJ berjalan mulus tanpa intervensi manual database.

---

### Jam 21:30 – 22:45 (Fase 8: Deployment Produksi Vercel & Firebase)
- **Tujuan**: Mempublikasikan aplikasi ke URL produksi yang dapat diakses oleh dewan juri secara publik.
- **Aktivitas Tim Terpadu**:
  * Konfigurasi `vercel.json` dan integrasikan repositori Git dengan Vercel.
  * Daftarkan seluruh variabel lingkungan produksi di Vercel Dashboard.
  * Terapkan aturan keamanan dan indeks Firestore via Firebase CLI (`firebase deploy --only firestore`).
  * Uji coba URL produksi: verifikasi bahwa rute API serverless berfungsi dan tidak menghasilkan galat 404/500.
- **Milestone 8**: Aplikasi tayang (*live*) di domain HTTPS produksi dengan SSL aktif dan basis data terhubung.

---

### Jam 22:45 – 24:00 (Fase 9: Persiapan Demo Interaktif & Pitch Rehearsal)
- **Tujuan**: Menyiapkan skenario demonstrasi penjurian langsung dan latihan presentasi.
- **Aktivitas Tim Terpadu**:
  * Siapkan 2 perangkat pengujian: 1 laptop (tampilan Admin & Mitra) dan 1 smartphone (tampilan Donatur QRIS).
  * Bersihkan data uji kotor atau siapkan 1 bencana demo aktif yang siap didonasikan.
  * Latihan simulasi presentasi 5-7 menit dengan alur cerita yang memikat dewan juri.
- **Milestone 9 (Final Goal)**: Tim 100% siap melakukan demonstrasi produk secara langsung di hadapan dewan juri hackathon.

---

## 3. Jalur Kritis & Matriks Ketergantungan (Critical Path Analysis)

Komponen berikut berada pada **Jalur Kritis (Critical Path)**. Keterlambatan pada komponen ini akan menghentikan seluruh tahapan berikutnya:

```
[Setup Server & DB] ──► [Firestore Security Rules] ──► [Auth Context]
                                                            │
                                                            ▼
[QRIS Callback HMAC] ◄── [Inquiry Duitku 'SP'] ◄── [Karantina BMKG & Admin Approval]
        │
        ▼
[Disbursement Atomic Transaction] ──► [Partner 6-Milestone Tracker] ──► [Final LPJ Demo]
```

---

## 4. Rencana Cadangan & Mitigasi Risiko Darurat (Fallback Plan)

| Potensi Masalah | Risiko Terhadap Demo | Rencana Mitigasi Darurat (Fallback) |
|---|---|---|
| **API BMKG Timeout / Down** | Gagal menarik data bencana baru | Endpoint server memiliki caching lokal data gempa terakhir dan skrip injeksi data bencana darurat terisolasi. |
| **Webhook Duitku Terhambat di Localhost** | Status pembayaran tidak otomatis berubah ke `PAID` | Halaman checkout telah dilengkapi fitur *auto-polling* setiap 3 detik ke endpoint `/api/payments/duitku/check-status/:orderId`. |
| **Kredensial Cloudinary Habis Kuota / Error** | Mitra gagal mengunggah foto logistik | Sistem menyediakan fallback preview URL base64 lokal dan placeholder gambar penyerahan darurat yang telah dioptimasi. |
| **Jaringan Seluler Lemah saat Presentasi** | Tampilan mobile lag atau aset berat | Seluruh aset statis telah di-bundle secara efisien oleh Vite; ikon menggunakan inline SVG Lucide yang sangat ringan. |

---

## 5. Fitur yang Dapat Ditunda jika Waktu Menipis (De-prioritization List)

Jika terjadi kendala teknis yang memakan waktu di luar jadwal, fitur non-kritis berikut **dapat ditunda** tanpa mengurangi kelayakan demonstrasi inti:

1. **Integrasi LLM AI Generator**: Analisis dampak bencana tetap menggunakan formula heuristik deterministik berbasis magnitudo dan kedalaman BMKG di `src/lib/utils.ts`.
2. **Notifikasi Email SMTP**: Pengiriman email kwitansi ditunda; tanda terima donasi digital cukup ditampilkan di layar `TransactionStatusPage`.
3. **Ekspor Laporan PDF**: Pengunduhan LPJ dalam format PDF dapat digantikan dengan tampilan cetak browser (*print view*) yang rapi pada halaman transparansi.
