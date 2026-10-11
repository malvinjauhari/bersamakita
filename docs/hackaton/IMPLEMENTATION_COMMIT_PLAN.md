# Rencana Rangkaian Commit Git (Git Commit Plan)

Dokumen ini menyajikan urutan *commit* Git hipotetis yang terstruktur dan kohesif untuk merekonstruksi proyek **Bersama Kita** dari repositori kosong (*from scratch*). Setiap commit disusun dengan standar **Conventional Commits**, mencakup batasan modul yang jelas, dependensi prasyarat, serta pemeriksaan kualitas yang wajib dilalui sebelum commit dilakukan.

> **Catatan Penting**: Rencana ini merupakan rancangan urutan pembangunan dari nol untuk keperluan panduan reka ulang sistem, bukan rekaman riwayat historis Git git-log repositori saat ini.

---

## Ringkasan Alur Commit (Commit Progression Overview)

```
Commit 01 (chore)    ──► Inisialisasi Proyek & Tooling Fullstack
Commit 02 (feat)     ──► Definisi Tipe Statis & Firestore Security Rules
Commit 03 (feat)     ──► Arsitektur Server Express & Polyfill Referer
Commit 04 (feat)     ──► Layanan Firebase Auth & Konteks Isolasi Sesi
Commit 05 (feat)     ──► Desain Sistem Tailwind v4 & Layout Shell Responsif
Commit 06 (feat)     ──► Integrasi BMKG Proxy & Karantina Bencana Draft
Commit 07 (feat)     ──► Dashboard Admin: Verifikasi Bencana & Guard Penugasan Mitra
Commit 08 (feat)     ──► Manajemen Akun Mitra Lapangan via Firebase Admin SDK
Commit 09 (feat)     ──► Kalkulasi Biaya Transparan (0,17%) & Form Donasi
Commit 10 (feat)     ──► Integrasi Duitku Direct API QRIS & Checkout Timer
Commit 11 (feat)     ──► Webhook Duitku: Validasi HMAC-SHA256 & Idempotensi
Commit 12 (feat)     ──► Disbursement Manager & Ledger Transaksi Atomik
Commit 13 (feat)     ──► Layanan Unggah Bukti Cloudinary Terotentikasi
Commit 14 (feat)     ──► Portal Mitra: Konfirmasi Penerimaan & Stepper 6 Milestone
Commit 15 (feat)     ──► Timeline Bencana Kolektif Publik (Privacy-Preserving)
Commit 16 (feat)     ──► Panel Audit Akhir, Penutupan Kampanye & Laporan LPJ
Commit 17 (ci/chore) ──► Konfigurasi Deployment Vercel Serverless & Indeks Firestore
Commit 18 (test)     ──► Audit End-to-End, Error Boundary & Dokumentasi Lengkap
```

---

## Rincian Spesifikasi Setiap Commit

### Commit #01: Inisialisasi Proyek & Tooling Fullstack
- **Pesan Commit**: `chore(init): setup fullstack repository with react 19, vite 6, tailwind 4, and express`
- **Tujuan**: Membangun fondasi monorepo dengan dependensi inti, konfigurasi build TypeScript, dan template variabel lingkungan.
- **Berkas yang Disertakan**:
  - `package.json`
  - `tsconfig.json`
  - `vite.config.ts`
  - `.env.example`
  - `.gitignore`
- **Prasyarat Commit**: Repositori kosong diinisialisasi (`git init`).
- **Pemeriksaan Sebelum Commit**:
  - Jalankan `npm install` untuk memastikan semua dependency resolvable.
  - Periksa `tsc --noEmit` untuk validasi konfigurasi TypeScript.
- **Kondisi Aplikasi Setelah Commit**: Proyek dapat di-install dan siap untuk penambahan kode sumber.

---

### Commit #02: Definisi Tipe Statis & Firestore Security Rules
- **Pesan Commit**: `feat(core): define system data models, fee formulas, and firestore security rules`
- **Tujuan**: Menetapkan kontrak tipe data TypeScript terpusat, rumus biaya transaksi 0,17%, serta aturan keamanan Firestore yang ketat sebelum database diakses.
- **Berkas yang Disertakan**:
  - `src/types/index.ts`
  - `src/lib/fees.ts`
  - `src/lib/firestore-errors.ts`
  - `firestore.rules`
- **Prasyarat Commit**: Commit #01.
- **Pemeriksaan Sebelum Commit**:
  - `npx tsc --noEmit` tanpa galat.
  - Uji logika formula di `src/lib/fees.ts` (kalkulasi admin fee dan batas penarikan).
- **Kondisi Aplikasi Setelah Commit**: Kontrak tipe data dan aturan keamanan Firestore siap dijadikan rujukan oleh frontend dan backend.

---

### Commit #03: Arsitektur Server Express & Polyfill Referer
- **Pesan Commit**: `feat(server): initialize express backend with firebase admin and vite dev middleware`
- **Tujuan**: Membangun server Express dengan polyfill header Referer untuk Firebase API restriction di Node.js, koneksi Firebase Admin SDK, dan penyajian Vite middleware.
- **Berkas yang Disertakan**:
  - `src/config/firebase.ts`
  - `src/config/firebase-admin.ts`
  - `server/app.ts`
  - `api/index.ts`
- **Prasyarat Commit**: Commit #02.
- **Pemeriksaan Sebelum Commit**:
  - Jalankan `npm run dev` dan pastikan server mendengarkan port 3005 tanpa crash.
  - Periksa respon `GET /api/unmatched-route` menghasilkan `{ success: false, message: 'Endpoint not found' }`.
- **Kondisi Aplikasi Setelah Commit**: Server fullstack berjalan secara lokal dan siap menerima rute API.

---

### Commit #04: Layanan Firebase Auth & Konteks Isolasi Sesi
- **Pesan Commit**: `feat(auth): implement firebase google auth, staff session isolation, and auth context`
- **Tujuan**: Membangun mekanisme login Google untuk donatur, login staf terproteksi, penyimpanan sesi aman (*safe-storage*), dan auto-reconciliation sesi.
- **Berkas yang Disertakan**:
  - `src/lib/safe-storage.ts`
  - `src/services/firebase/auth.ts`
  - `src/features/auth/AuthContext.tsx`
  - `src/features/auth/UserLoginPage.tsx`
  - `src/features/admin/AdminAuthPage.tsx`
  - `src/features/partner/PartnerAuthPage.tsx`
- **Prasyarat Commit**: Commit #03.
- **Pemeriksaan Sebelum Commit**:
  - Pengujian login Google donatur membuat dokumen baru di koleksi `users`.
  - Pastikan pergantian ke akun biasa otomatis membersihkan `staffSession` di localStorage.
- **Kondisi Aplikasi Setelah Commit**: Autentikasi multi-peran (User, Admin, Mitra) beroperasi secara independen tanpa bentrok hak akses.

---

### Commit #05: Desain Sistem Tailwind v4 & Layout Shell Responsif
- **Pesan Commit**: `feat(ui): implement modern layout shell, responsive navbar, toast, and skeleton loaders`
- **Tujuan**: Menghadirkan tata letak antarmuka modern dengan gaya glassmorphism, navigasi adaptif desktop/mobile, toast context, dan skeleton loading.
- **Berkas yang Disertakan**:
  - `src/index.css`
  - `src/lib/utils.ts`
  - `src/components/feedback/Toast.tsx`
  - `src/components/feedback/Skeleton.tsx`
  - `src/components/layout/WideNavbar.tsx`
  - `src/components/layout/WideFooter.tsx`
  - `src/components/layout/HackathonBanner.tsx`
  - `src/components/landing/MinimalistLanding.tsx`
  - `src/main.tsx`
  - `src/App.tsx` (Struktur dasar)
- **Prasyarat Commit**: Commit #04.
- **Pemeriksaan Sebelum Commit**:
  - Uji tampilan pada viewport 360px (mobile) hingga 1920px (desktop) tanpa horizontal scrollbar.
  - Notifikasi Toast muncul dan hilang secara mulus sesuai durasi timeout.
- **Kondisi Aplikasi Setelah Commit**: Antarmuka memiliki cangkang navigasi profesional, landing page fungsional, dan visual konsisten.

---

### Commit #06: Integrasi BMKG Proxy & Karantina Bencana Draft
- **Pesan Commit**: `feat(bmkg): implement bmkg api proxy and staged ingestion with pending verification state`
- **Tujuan**: Menarik data gempabumi resmi BMKG melalui endpoint backend dan mengarantina seluruh kandidat baru ke status `pending_verification`.
- **Berkas yang Disertakan**:
  - `src/services/bmkg.ts`
  - `server/routes/bmkg.ts`
  - `src/features/disaster/KatalogBMKGPage.tsx`
  - `src/features/disaster/SituationAnalysisPage.tsx`
- **Prasyarat Commit**: Commit #05.
- **Pemeriksaan Sebelum Commit**:
  - Panggil `POST /api/bmkg/refresh` dengan token otentikasi.
  - Pastikan dokumen di koleksi `disasters` berstatus `pending_verification`.
  - Pastikan data berstatus pending **TIDAK MUNCUL** pada query publik donatur.
- **Kondisi Aplikasi Setelah Commit**: Data resmi BMKG berhasil masuk ke sistem isolasi internal secara otomatis tanpa risiko tayang prematur.

---

### Commit #07: Dashboard Admin: Verifikasi Bencana & Guard Penugasan Mitra
- **Pesan Commit**: `feat(admin): build bmkg verification workflow with mandatory partner assignment guard`
- **Tujuan**: Menghadirkan antarmuka telaah bencana untuk admin dengan validasi ketat: tombol persetujuan nonaktif hingga mitra lapangan dipilih.
- **Berkas yang Disertakan**:
  - `src/features/admin/AdminPortalView.tsx`
  - `src/features/disaster/BMKGVerificationCard.tsx`
  - `src/features/disaster/WideDisasterDashboard.tsx`
- **Prasyarat Commit**: Commit #06.
- **Pemeriksaan Sebelum Commit**:
  - Coba klik approve tanpa memilih mitra; aksi harus ditolak oleh UI dan validasi schema.
  - Setelah disetujui dengan mitra sah, verifikasi bahwa bencana langsung tayang di `WideDisasterDashboard`.
- **Kondisi Aplikasi Setelah Commit**: Bencana hanya dapat dipublikasikan melalui keputusan sadar admin bersama mitra penanggung jawab.

---

### Commit #08: Manajemen Akun Mitra Lapangan via Firebase Admin SDK
- **Pesan Commit**: `feat(partner): implement restricted partner creation endpoint and directory view`
- **Tujuan**: Membangun mekanisme pendaftaran mitra lapangan terakreditasi yang hanya dapat dieksekusi oleh admin melalui backend server.
- **Berkas yang Disertakan**:
  - `server/routes/admin.ts`
  - `src/features/partner/AdminPartnersView.tsx`
- **Prasyarat Commit**: Commit #07.
- **Pemeriksaan Sebelum Commit**:
  - Request `POST /api/admin/create-partner` tanpa token admin mengembalikan HTTP 403 Forbidden.
  - Dengan token admin, akun Firebase Auth baru terbuat dan tersimpan di koleksi `users` (`role: partner`) dan `partners`.
- **Kondisi Aplikasi Setelah Commit**: Admin dapat mengelola direktori lembaga mitra operasional yang siap ditugaskan ke lokasi bencana.

---

### Commit #09: Kalkulasi Biaya Transparan (0,17%) & Form Donasi
- **Pesan Commit**: `feat(donation): create donation input flow with transparent 0.17% fee breakdown`
- **Tujuan**: Membangun antarmuka donasi ramah pengguna dengan preset nominal, input pesan doa, donasi anonim, dan transparansi rincian biaya layanan QRIS.
- **Berkas yang Disertakan**:
  - `src/features/donation/TransactionDonatePage.tsx`
  - `src/features/donation/TransactionUniversalDispatcher.tsx`
- **Prasyarat Commit**: Commit #07.
- **Pemeriksaan Sebelum Commit**:
  - Input donasi Rp100.000 menampilkan rincian: Donasi Rp100.000 + Biaya QRIS Rp170 = Total Rp100.170.
  - Validasi batas minimum donasi Rp10.000 berfungsi dengan pesan galat yang jelas.
- **Kondisi Aplikasi Setelah Commit**: Donatur dapat memilih bencana dan nominal donasi dengan transparansi biaya yang utuh.

---

### Commit #10: Integrasi Duitku Direct API QRIS & Checkout Timer
- **Pesan Commit**: `feat(payment): integrate duitku direct api for qris invoice creation and checkout countdown`
- **Tujuan**: Menghubungkan proses checkout ke API inquiry Duitku metode `SP`, me-render kode QR interaktif, dan menjalankan timer kedaluwarsa 60 menit.
- **Berkas yang Disertakan**:
  - `server/routes/payments.ts` (Bagian inquiry endpoint `/create`)
  - `src/features/donation/TransactionCheckoutPage.tsx`
- **Prasyarat Commit**: Commit #09.
- **Pemeriksaan Sebelum Commit**:
  - Endpoint mengembalikan `qrString` yang valid dari sandbox Duitku.
  - Halaman checkout me-render QRIS dan hitung mundur berjalan mundur setiap detik.
- **Kondisi Aplikasi Setelah Commit**: Donatur dapat memindai QRIS secara langsung menggunakan simulator e-wallet/perbankan.

---

### Commit #11: Webhook Duitku: Validasi HMAC-SHA256 & Idempotensi
- **Pesan Commit**: `feat(payment): add hmac-sha256 signature verification and idempotent callback handling`
- **Tujuan**: Menjamin keamanan penerimaan notifikasi pembayaran dari Duitku, memvalidasi tanda tangan kriptografi, dan mencegah penambahan saldo ganda pada callback berulang.
- **Berkas yang Disertakan**:
  - `server/routes/payments.ts` (Bagian callback webhook `/callback` & `/check-status`)
  - `src/features/donation/TransactionStatusPage.tsx`
  - `src/features/donation/MyDonationsPage.tsx`
- **Prasyarat Commit**: Commit #10.
- **Pemeriksaan Sebelum Commit**:
  - Kirim callback dengan signature palsu; server wajib merespon HTTP 403 Forbidden.
  - Kirim callback valid berturut-turut 2 kali; callback kedua mengembalikan status sukses tanpa memutasi ulang database.
- **Kondisi Aplikasi Setelah Commit**: Pembayaran berhasil diverifikasi secara sah dan transaksi donatur tercatat aman di riwayat donasi.

---

### Commit #12: Disbursement Manager & Ledger Transaksi Atomik
- **Pesan Commit**: `feat(finance): implement atomic disbursement manager with deficit prevention transaction`
- **Tujuan**: Membangun sistem pencairan dana donasi yang divalidasi langsung oleh transaksi atomik `runTransaction()` Firestore untuk mencegah pencairan melebihi kas.
- **Berkas yang Disertakan**:
  - `server/routes/fundraising.ts` (Endpoint `/summary` & `/admin/disbursements`)
  - `src/features/finance/DisbursementManager.tsx`
  - `src/features/finance/AdminTransactionsView.tsx`
- **Prasyarat Commit**: Commit #11.
- **Pemeriksaan Sebelum Commit**:
  - Ajukan penarikan dana Rp10.000.000 padahal saldo tersisa Rp5.000.000; backend wajib melempar pesan galat saldo tidak cukup.
  - Penarikan valid membuat dokumen `disbursements` dan `partnerAllocations` secara atomik.
- **Kondisi Aplikasi Setelah Commit**: Arus kas keluar tercatat dalam buku besar (*ledger*) yang akuntabel dan terlindungi dari saldo negatif.

---

### Commit #13: Layanan Unggah Bukti Cloudinary Terotentikasi
- **Pesan Commit**: `feat(media): implement signed cloudinary upload service with role validation`
- **Tujuan**: Memfasilitasi mitra lapangan dan admin mengunggah foto bukti dokumentasi logistik ke Cloudinary dengan tanda tangan berbatas waktu dari server.
- **Berkas yang Disertakan**:
  - `server/routes/images.ts`
  - `src/services/cloudinary.ts`
  - `src/components/ImageUploadField.tsx`
- **Prasyarat Commit**: Commit #08.
- **Pemeriksaan Sebelum Commit**:
  - Pengguna tanpa login ditolak mendapatkan tanda tangan unggah.
  - File non-gambar atau ukuran melebihi 5 MB ditolak di sisi klien sebelum diunggah.
- **Kondisi Aplikasi Setelah Commit**: Media dokumentasi dapat diunggah dengan aman langsung ke CDN tanpa mengekspos secret key Cloudinary di frontend.

---

### Commit #14: Portal Mitra: Konfirmasi Penerimaan & Stepper 6 Milestone
- **Pesan Commit**: `feat(partner): build partner dashboard with fund receipt confirmation and 6-milestone tracker`
- **Tujuan**: Membangun alur konfirmasi dana oleh mitra serta kartu pembaruan 6 tahapan penyaluran logistik berbukti foto dan geolokasi posko.
- **Berkas yang Disertakan**:
  - `src/features/partner/PartnerDashboardView.tsx`
  - `src/features/distribution/DistributionProgressCard.tsx`
- **Prasyarat Commit**: Commit #12, Commit #13.
- **Pemeriksaan Sebelum Commit**:
  - Mitra dapat mengonfirmasi pencairan yang disetujui admin.
  - Setiap pembaruan milestone (misal: Barang Dikemas -> Dalam Pengiriman) tersimpan di dokumen alokasi mitra.
- **Kondisi Aplikasi Setelah Commit**: Mitra lapangan memiliki kendali penuh untuk melaporkan progres bantuan posko secara terstruktur.

---

### Commit #15: Timeline Bencana Kolektif Publik (Privacy-Preserving)
- **Pesan Commit**: `feat(transparency): implement collective disaster timeline without exposing donor pii`
- **Tujuan**: Menyediakan garis waktu kronologis per bencana yang dapat dipantau oleh semua donatur dan publik tanpa mengekspos identitas pribadi donatur lain.
- **Berkas yang Disertakan**:
  - `src/features/distribution/DisasterTimelineSection.tsx`
  - `src/features/distribution/PublicReportsView.tsx`
- **Prasyarat Commit**: Commit #14.
- **Pemeriksaan Sebelum Commit**:
  - Buka halaman bencana sebagai donatur publik atau tamu; seluruh riwayat milestone dan penyaluran tampil dengan foto dan tanggal.
  - Pastikan tidak ada field email atau nomor telepon donatur yang bocor di respons timeline.
- **Kondisi Aplikasi Setelah Commit**: Transparansi publik terwujud secara utuh dan terstandarisasi.

---

### Commit #16: Panel Audit Akhir, Penutupan Kampanye & Laporan LPJ
- **Pesan Commit**: `feat(report): implement campaign closing endpoint, audit logging, and final lpj report section`
- **Tujuan**: Memfasilitasi admin untuk menutup kampanye bencana (`archived`), mengunci donasi baru, dan menerbitkan dokumen Laporan Pertanggungjawaban (LPJ) publik.
- **Berkas yang Disertakan**:
  - `server/routes/fundraising.ts` (Endpoint `/report/:disasterId` & `/admin/close`)
  - `src/features/distribution/AdminFinalReportPanel.tsx`
  - `src/features/distribution/FinalReportSection.tsx`
  - `src/features/distribution/TransparansiReportsPage.tsx`
  - `src/features/operations/AuditLogsView.tsx`
- **Prasyarat Commit**: Commit #15.
- **Pemeriksaan Sebelum Commit**:
  - Eksekusi penutupan kampanye mengubah status bencana menjadi `archived`.
  - Akses rute donasi pada bencana yang diarsipkan menampilkan informasi bahwa penggalangan dana telah ditutup.
  - Halaman transparansi menampilkan dokumen LPJ final dengan kalkulasi saldo yang balance.
- **Kondisi Aplikasi Setelah Commit**: Siklus hidup tanggap bencana dapat diselesaikan secara tuntas dan terdokumentasi akuntabel.

---

### Commit #17: Konfigurasi Deployment Vercel Serverless & Indeks Firestore
- **Pesan Commit**: `chore(deploy): configure vercel rewrites, serverless functions, and firestore compound indexes`
- **Tujuan**: Mempersiapkan infrastruktur hosting produksi di Vercel dan mendaftarkan indeks gabungan database Firestore.
- **Berkas yang Disertakan**:
  - `vercel.json`
  - `firestore.indexes.json`
- **Prasyarat Commit**: Commit #16.
- **Pemeriksaan Sebelum Commit**:
  - Jalankan `npm run build` untuk memverifikasi output folder `dist/`.
  - Pastikan indeks komposit untuk query donasi (`userId` + `createdAt`) tercatat di `firestore.indexes.json`.
- **Kondisi Aplikasi Setelah Commit**: Repositori siap dideploy ke Vercel tanpa kendala rute atau *missing index error* di Firestore.

---

### Commit #18: Audit End-to-End, Error Boundary & Dokumentasi Lengkap
- **Pesan Commit**: `docs(audit): complete hackathon documentation package and perform end-to-end audit`
- **Tujuan**: Melengkapi seluruh dokumen persiapan hackathon, menyempurnakan penanganan galat (*error handling*), dan memastikan kebersihan kode sumber.
- **Berkas yang Disertakan**:
  - `docs/hackaton/FROM_SCRATCH_IMPLEMENTATION_PLAN.md`
  - `docs/hackaton/IMPLEMENTATION_FILE_MAP.md`
  - `docs/hackaton/IMPLEMENTATION_COMMIT_PLAN.md`
  - `docs/hackaton/IMPLEMENTATION_24H_SCHEDULE.md`
  - `docs/hackaton/IMPLEMENTATION_DEPENDENCY_GRAPH.md`
  - `docs/hackaton/IMPLEMENTATION_ACCEPTANCE_CRITERIA.md`
- **Prasyarat Commit**: Commit #17.
- **Pemeriksaan Sebelum Commit**:
  - Jalankan `npm run lint` (`tsc --noEmit`) dengan hasil 0 error.
  - Simulasi skenario penjurian hackathon dari awal hingga akhir (Ingesti BMKG -> Assign Mitra -> Donasi QRIS -> Pencairan -> Laporan 6 Milestone -> LPJ).
- **Kondisi Aplikasi Setelah Commit**: Proyek berstatus *Production-Ready*, teruji secara komprehensif, dan siap dipresentasikan di hadapan dewan juri.
