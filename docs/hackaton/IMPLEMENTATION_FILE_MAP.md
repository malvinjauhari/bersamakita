# Peta Implementasi Berkas (Implementation File Map)

Dokumen ini memetakan setiap berkas utama dalam repositori **Bersama Kita** ke dalam tahapan implementasi logis (*Stage 1 s.d. Stage 12*), lengkap dengan peran berkas, prasyarat implementasi, dependensi modul, dan metode verifikasinya.

---

## 1. Konfigurasi Proyek & Alat Pengembang (Tooling & Environment)

| Path Berkas | Status | Tanggung Jawab / Peran | Tahap | Prasyarat | Dependensi Internal / Eksternal | Metode Verifikasi |
|---|---|---|---|---|---|---|
| `package.json` | Aktual | Definisi dependensi monorepo, engine Node 22, modul ES, dan scripts build | Tahap 1 | Node.js 22 LTS | npm ecosystem | `npm install` berhasil tanpa konflik dependensi |
| `tsconfig.json` | Aktual | Konfigurasi kompilasi TypeScript (target ES2022, bundler module resolution) | Tahap 1 | `package.json` | `typescript` | `npx tsc --noEmit` berjalan lancar |
| `vite.config.ts` | Aktual | Konfigurasi bundler Vite dan integrasi plugin Tailwind CSS v4 & React | Tahap 1 | `package.json` | `@vitejs/plugin-react`, `@tailwindcss/vite` | `npx vite build --dry-run` |
| `.env.example` | Aktual | Dokumentasi template variabel lingkungan frontend (`VITE_*`) dan rahasia backend | Tahap 1 | Tidak ada | dotenv | Validasi pemisahan variabel publik vs privat |
| `vercel.json` | Aktual | Konfigurasi routing serverless Vercel (`/api/*` ke Express, `/*` ke SPA) | Tahap 12 | Tahap 3 | Vercel Platform | Uji coba preview deployment di Vercel |

---

## 2. Model Data, Tipe Statis & Aturan Keamanan Database

| Path Berkas | Status | Tanggung Jawab / Peran | Tahap | Prasyarat | Dependensi Internal / Eksternal | Metode Verifikasi |
|---|---|---|---|---|---|---|
| `src/types/index.ts` | Aktual | Single Source of Truth definisi antarmuka TypeScript (User, Disaster, Donation, Partner, Disbursement, Milestone) | Tahap 2 | Tahap 1 | Tidak ada | Seluruh modul dapat mengimpor interface tanpa circular dependency |
| `src/lib/fees.ts` | Aktual | Rumus baku biaya admin 0,17% dan batas minimal/maksimal pencairan dana | Tahap 2 | `src/types/index.ts` | Tidak ada | Unit test kalkulasi: `calculateAdminFee(100000) === 170` |
| `src/lib/firestore-errors.ts` | Aktual | Standarisasi penanganan galat izin dan koneksi Firestore | Tahap 2 | Tahap 1 | Tidak ada | Simulasi galat izin menghasilkan pesan yang ramah pengguna |
| `firestore.rules` | Aktual | Aturan keamanan declarative Firestore: RBAC, isolasi donasi privat, dan karantina data BMKG | Tahap 2 | `src/types/index.ts` | Firebase Security Rules Emulator | Pengujian aturan via emulator: donatur biasa ditolak membaca `pending_verification` |

---

## 3. Fondasi Backend & Serverless API Gateway

| Path Berkas | Status | Tanggung Jawab / Peran | Tahap | Prasyarat | Dependensi Internal / Eksternal | Metode Verifikasi |
|---|---|---|---|---|---|---|
| `src/config/firebase.ts` | Aktual | Inisialisasi Firebase Client SDK (`auth`, `db`) untuk konsumsi browser | Tahap 3 | Tahap 1 | `firebase/app`, `firebase/auth`, `firebase/firestore` | `testConnection()` berhasil menghubungi Firestore |
| `src/config/firebase-admin.ts` | Aktual | Inisialisasi Firebase Admin SDK secara aman untuk otorisasi server | Tahap 3 | Tahap 1 | `firebase-admin` | `adminDb` dapat membaca koleksi tanpa pembatasan aturan klien |
| `server/app.ts` | Aktual | Server Express: polyfill fetch Referer, Vite dev middleware, penanganan JSON, dan listener | Tahap 3 | `firebase-admin.ts` | `express`, `dotenv`, `vite` | Akses `http://localhost:3005` mengembalikan aplikasi atau respon API |
| `api/index.ts` | Aktual | Titik masuk Vercel Serverless Function yang mendelegasikan request ke Express `app` | Tahap 3 | `server/app.ts` | `express` | Panggilan `/api/*` pada serverless menghasilkan 404 JSON (bukan HTML) |

---

## 4. Layanan Autentikasi & Manajemen Sesi

| Path Berkas | Status | Tanggung Jawab / Peran | Tahap | Prasyarat | Dependensi Internal / Eksternal | Metode Verifikasi |
|---|---|---|---|---|---|---|
| `src/lib/safe-storage.ts` | Aktual | Wrapper aman browser storage (`localStorage`) dengan mitigasi quota error & incognito | Tahap 4 | Tahap 1 | Web Storage API | Simpan dan ambil data uji saat storage mock error |
| `src/services/firebase/auth.ts` | Aktual | Handler login Google Firebase Client, sinkronisasi profil user, dan pemetaan peran staf | Tahap 4 | `firebase.ts`, `types` | `firebase/auth`, `safe-storage` | Alur login popup Google berhasil membuat dokumen di koleksi `users` |
| `src/features/auth/AuthContext.tsx` | Aktual | Provider konteks autentikasi: isolasi sesi User vs Staf (Admin/Mitra) dan auto-reconciliation | Tahap 4 | `auth.ts` | React Context API | Sesi staf dibersihkan jika pengguna login dengan akun Google biasa |
| `src/features/auth/UserLoginPage.tsx` | Aktual | Halaman UI login interaktif Donatur via akun Google | Tahap 4 | `AuthContext.tsx` | `lucide-react` | Tombol login Google mengarahkan ke dashboard pasca-sukses |
| `src/features/admin/AdminAuthPage.tsx` | Aktual | Halaman login khusus Administrator dengan proteksi kredensial | Tahap 4 | `AuthContext.tsx` | `lucide-react` | Kredensial admin valid membuka portal admin |
| `src/features/partner/PartnerAuthPage.tsx` | Aktual | Halaman login khusus Mitra Lapangan terdaftar | Tahap 4 | `AuthContext.tsx` | `lucide-react` | Kredensial mitra valid membuka dashboard mitra |

---

## 5. UI Shell, Layout Responsif & Shared Feedback

| Path Berkas | Status | Tanggung Jawab / Peran | Tahap | Prasyarat | Dependensi Internal / Eksternal | Metode Verifikasi |
|---|---|---|---|---|---|---|
| `src/index.css` | Aktual | Impor token Tailwind CSS v4, konfigurasi font, dan styling global glassmorphism | Tahap 5 | Tahap 1 | `@tailwindcss/vite` | Halaman menerapkan palet warna dan utilitas styling |
| `src/lib/utils.ts` | Aktual | Utilitas pembantu format mata uang (`formatRupiah`), tanggal lokal, dan kalkulasi progres | Tahap 5 | `types` | `Intl` API | `formatRupiah(25000)` mengembalikan `"Rp 25.000"` |
| `src/components/feedback/Toast.tsx` | Aktual | Komponen notifikasi pop-up dinamis (sukses, error, info) berbasis context | Tahap 5 | Tahap 1 | React Context | `showToast('Tes', 'success')` me-render banner di layar |
| `src/components/feedback/Skeleton.tsx` | Aktual | Kartu placeholder animasi saat pengambilan data asynchronous | Tahap 5 | Tahap 1 | Tailwind animate-pulse | Tampilan shimmer muncul saat `dataLoading === true` |
| `src/components/layout/WideNavbar.tsx` | Aktual | Header navigasi adaptif dengan status sesi aktif dan navigasi multi-halaman | Tahap 5 | `AuthContext.tsx` | `react-router-dom`, `lucide-react` | Navigasi responsif pada viewport mobile (hamburger menu) |
| `src/components/layout/WideFooter.tsx` | Aktual | Footer standar platform memuat hak cipta dan navigasi kebijakan | Tahap 5 | Tahap 1 | `react-router-dom` | Render elemen footer di dasar halaman |
| `src/components/layout/HackathonBanner.tsx` | Aktual | Banner atas penanda lingkungan evaluasi kompetisi hackathon nasional | Tahap 5 | Tahap 1 | `lucide-react` | Tampil di seluruh halaman dengan tombol dismiss |
| `src/components/landing/MinimalistLanding.tsx` | Aktual | Halaman beranda utama dengan narasi masalah, call-to-action, dan metrik dampak | Tahap 5 | `WideNavbar.tsx` | `lucide-react` | Akses rute `/` menampilkan landing page |

---

## 6. Modul Bencana & Karantina BMKG

| Path Berkas | Status | Tanggung Jawab / Peran | Tahap | Prasyarat | Dependensi Internal / Eksternal | Metode Verifikasi |
|---|---|---|---|---|---|---|
| `src/services/bmkg.ts` | Aktual | Parser dan normalizer data XML/JSON gempabumi BMKG ke format internal | Tahap 6 | `types` | `fetch` API | Payload BMKG berhasil dikonversi menjadi `Disaster` draft |
| `server/routes/bmkg.ts` | Aktual | Endpoint proxy dan sinkronisasi server: `POST /api/bmkg/refresh` (Admin SDK) | Tahap 6 | `bmkg.ts`, `firebase-admin.ts` | Express Router | Menulis ke `earthquakeEvents` dan `disasters` (`pending_verification`) |
| `src/features/disaster/BMKGVerificationCard.tsx` | Aktual | Komponen admin untuk telaah bencana BMKG dan penugasan mitra wajib | Tahap 6 | `types`, `AuthContext.tsx` | `lucide-react` | Tombol Approve terkunci jika mitra belum dipilih |
| `src/features/disaster/WideDisasterDashboard.tsx` | Aktual | Katalog bencana publik donatur (filter ketat `status == 'admin_approved'`) | Tahap 6 | `types`, `WideNavbar.tsx` | `lucide-react` | Data `pending_verification` tidak muncul pada donatur |
| `src/features/disaster/KatalogBMKGPage.tsx` | Aktual | Halaman visual edukasi data seismik gempa bumi terkini | Tahap 6 | `bmkg.ts` | Leaflet/Peta & Tabel | Menampilkan koordinat gempa terkini dari BMKG |
| `src/features/disaster/SituationAnalysisPage.tsx` | Aktual | Analisis dampak bencana dan kalkulasi kebutuhan logistik lapangan | Tahap 6 | `types` | Heuristic evaluation | Analisis risiko menampilkan tingkat keparahan yang tepat |

---

## 7. Modul Administrasi & Manajemen Mitra Lapangan

| Path Berkas | Status | Tanggung Jawab / Peran | Tahap | Prasyarat | Dependensi Internal / Eksternal | Metode Verifikasi |
|---|---|---|---|---|---|---|
| `server/routes/admin.ts` | Aktual | Endpoint restricted: `POST /api/admin/create-partner` via Firebase Admin SDK | Tahap 7 | `firebase-admin.ts` | Express Router | Membuat Firebase Auth User dan dokumen di `users` & `partners` |
| `src/features/admin/AdminPortalView.tsx` | Aktual | Dashboard utama administrator (tab verifikasi, mitra, keuangan, audit) | Tahap 7 | Tahap 6 | `lucide-react` | Admin dapat berpindah antar-tab manajemen dengan mulus |
| `src/features/partner/AdminPartnersView.tsx` | Aktual | Formulir pendaftaran mitra baru dan monitoring keaktifan mitra lapangan | Tahap 7 | `server/routes/admin.ts` | `lucide-react` | Admin berhasil mendaftarkan mitra dan melihatnya di daftar |

---

## 8. Modul Transaksi Donasi & Pembayaran QRIS Duitku

| Path Berkas | Status | Tanggung Jawab / Peran | Tahap | Prasyarat | Dependensi Internal / Eksternal | Metode Verifikasi |
|---|---|---|---|---|---|---|
| `server/routes/payments.ts` | Aktual | Endpoint create invoice QRIS Duitku Direct API, validasi webhook HMAC-SHA256, dan cek status | Tahap 8 | `fees.ts`, `firebase-admin.ts` | `crypto`, Express Router | Invoice terbuat, signature valid, dan webhook mutasi Firestore |
| `src/features/donation/TransactionDonatePage.tsx` | Aktual | Formulir pemilihan nominal donasi, kalkulasi biaya admin transparan, dan data donatur | Tahap 8 | `fees.ts`, `types` | `lucide-react` | Mengirim permohonan invoice ke backend dan mengarahkan ke checkout |
| `src/features/donation/TransactionCheckoutPage.tsx` | Aktual | Antarmuka pembayaran: render QRIS, timer kedaluwarsa 60 menit, dan polling status otomatis | Tahap 8 | `payments.ts` | `react-router-dom` | Memindai QRIS memicu perubahan status ke sukses secara instan |
| `src/features/donation/TransactionStatusPage.tsx` | Aktual | Halaman bukti tanda terima donasi sah dengan status finansial valid | Tahap 8 | `types` | `lucide-react` | Menampilkan ringkasan nominal donasi dan nama bencana |
| `src/features/donation/MyDonationsPage.tsx` | Aktual | Halaman riwayat donasi donatur (terisolasi database-level per user UID) | Tahap 8 | `AuthContext.tsx` | `lucide-react` | User A hanya melihat donasi User A, User B melihat donasi User B |

---

## 9. Modul Keuangan & Pencairan Dana (Disbursement)

| Path Berkas | Status | Tanggung Jawab / Peran | Tahap | Prasyarat | Dependensi Internal / Eksternal | Metode Verifikasi |
|---|---|---|---|---|---|---|
| `server/routes/fundraising.ts` | Aktual | Endpoint `GET /summary`, `POST /admin/disbursements` (transaksi atomik), `POST /admin/close` | Tahap 9 | `fees.ts`, `firebase-admin.ts` | Express Router | `runTransaction()` menolak pencairan melebihi sisa kas |
| `src/features/finance/DisbursementManager.tsx` | Aktual | Panel admin pencairan dana: kalkulasi saldo riil, pengajuan pencairan ke mitra, riwayat ledger | Tahap 9 | `fundraising.ts` | `lucide-react` | Pengajuan pencairan berhasil memotong saldo kas tersedia |
| `src/features/finance/AdminTransactionsView.tsx` | Aktual | Tabel pemantauan seluruh transaksi masuk dan keluar platform | Tahap 9 | `types` | `lucide-react` | Menampilkan status transaksi `paid`, `pending`, dan `disbursed` |

---

## 10. Modul Mitra Lapangan, Pelaporan 6 Milestone & Media

| Path Berkas | Status | Tanggung Jawab / Peran | Tahap | Prasyarat | Dependensi Internal / Eksternal | Metode Verifikasi |
|---|---|---|---|---|---|---|
| `server/routes/images.ts` | Aktual | Endpoint otorisasi tanda tangan SHA-1 unggah foto Cloudinary terproteksi peran | Tahap 10 | `firebase-admin.ts` | `crypto`, Express Router | Pengguna tanpa token admin/partner ditolak mendapatkan signature |
| `src/services/cloudinary.ts` | Aktual | Klien pengunggah gambar langsung ke Cloudinary REST API dengan verifikasi signature | Tahap 10 | `server/routes/images.ts` | `XMLHttpRequest` | Foto berhasil terunggah dan mengembalikan `secure_url` yang valid |
| `src/features/partner/PartnerDashboardView.tsx` | Aktual | Dashboard operasional posko mitra untuk memantau dana yang dialokasikan | Tahap 10 | `AuthContext.tsx` | `lucide-react` | Mitra dapat melihat alokasi bencana yang ditugaskan |
| `src/features/distribution/DistributionProgressCard.tsx` | Aktual | Stepper pelaporan 6 milestone logistik lapangan lengkap dengan unggah foto Cloudinary | Tahap 10 | `cloudinary.ts`, `types` | `lucide-react` | Pembaruan tahapan memicu event di `disasterTimeline` |

---

## 11. Modul Transparansi & Laporan Akhir (LPJ)

| Path Berkas | Status | Tanggung Jawab / Peran | Tahap | Prasyarat | Dependensi Internal / Eksternal | Metode Verifikasi |
|---|---|---|---|---|---|---|
| `src/features/distribution/DisasterTimelineSection.tsx` | Aktual | Garis waktu kronologis kolektif bantuan bencana untuk donatur dan publik | Tahap 11 | `types` | `lucide-react` | Menampilkan seluruh event tanpa membocorkan PII donatur |
| `src/features/distribution/FinalReportSection.tsx` | Aktual | Laporan pertanggungjawaban final (LPJ) terverifikasi dengan data transaksi nyata | Tahap 11 | `fundraising.ts` | `lucide-react` | Angka total donasi dan pengeluaran cocok 100% dengan ledger |
| `src/features/distribution/TransparansiReportsPage.tsx` | Aktual | Halaman publik pengarsipan dokumen LPJ bencana yang telah selesai | Tahap 11 | `types` | `lucide-react` | Publik dapat mengakses arsip posko yang telah ditutup |
| `src/features/distribution/AdminFinalReportPanel.tsx` | Aktual | Panel persetujuan admin untuk audit akhir dan penutupan kampanye | Tahap 11 | `fundraising.ts` | `lucide-react` | Tombol tutup mengubah status bencana menjadi `archived` |

---

## 12. Titik Masuk Aplikasi & Routing Utama (App Integration)

| Path Berkas | Status | Tanggung Jawab / Peran | Tahap | Prasyarat | Dependensi Internal / Eksternal | Metode Verifikasi |
|---|---|---|---|---|---|---|
| `src/main.tsx` | Aktual | Titik masuk React 19: me-mount `App` ke elemen root DOM | Tahap 5 | `App.tsx` | `react-dom/client` | Root element ter-render di browser |
| `src/App.tsx` | Aktual | Routing utama aplikasi (`react-router-dom`), manajemen data terpusat, dan guard otorisasi | Tahap 5 s.d. 12 | Seluruh Komponen | `react-router-dom`, `AuthContext` | Semua rute navigasi publik, admin, dan mitra berfungsi tanpa error 404 |
