# Rencana Implementasi "From-Scratch" Proyek Bersama Kita

## 1. Konteks Proyek & Ringkasan Eksekutif

Dokumen ini merupakan panduan implementasi teknis dari nol (*from-scratch implementation plan*) untuk membangun kembali platform **Bersama Kita**. Dokumen ini direkonstruksi secara presisi berdasarkan arsitektur nyata, logika bisnis, aturan keamanan, dan integrasi yang ada pada repositori referensi.

**Bersama Kita** adalah platform tanggap darurat bencana dan donasi terverifikasi yang mengintegrasikan data seismik resmi (BMKG Open Data API), gerbang pembayaran QRIS (*Duitku Direct API*), tata kelola penugasan mitra lapangan terakreditasi, pencairan dana atomik, pelacakan logistik 6 milestone berbukti visual (*Cloudinary*), serta lini masa transparansi kolektif publik tanpa membocorkan privasi donatur (*Privacy-Preserving Collective Timeline*).

Prinsip utama pembangunan kembali:
1. **Zero Auto-Approval**: Data mentah BMKG tidak pernah langsung tayang ke publik sebelum diverifikasi secara eksplisit oleh admin dan ditugaskan mitra lapangan penanggung jawab.
2. **Server-Side Authoritative Payments**: Status pembayaran hanya dapat diubah oleh webhook callback backend terverifikasi tanda tangan HMAC-SHA256 atau verifikasi status langsung ke Duitku. Klien tidak pernah memiliki wewenang mengubah status transaksi menjadi `paid`.
3. **Atomic Balance & Outflow Protection**: Seluruh permohonan pencairan dana divalidasi terhadap saldo nyata di backend menggunakan Firestore `runTransaction()` untuk mencegah *over-disbursement*.
4. **Restricted Partner Registration**: Akun mitra lapangan hanya dapat diterbitkan melalui otorisasi dashboard admin melalui Firebase Admin SDK.

---

## 2. Peta Tahapan Pengembangan (Development Stages Overview)

Pengembangan sistem dibagi menjadi 12 tahapan logis berorientasi dependensi:

| Tahap | Nama Tahap | Fokus Utama | Estimasi Waktu |
|---|---|---|---|
| **Tahap 1** | Inisialisasi Proyek & Tooling | Vite, React 19, TypeScript, Tailwind CSS v4, Express, tsx | 1.5 Jam |
| **Tahap 2** | Fondasi Data & Keamanan Firestore | Model data TypeScript, Firestore Rules, Sanitasi Undefined | 2.0 Jam |
| **Tahap 3** | Server Backend & API Gateway | Server Express, Vite Middleware, Polyfill Referer, Routing Dasar | 1.5 Jam |
| **Tahap 4** | Autentikasi Multirole & Sesi | Firebase Auth (User Google), Custom RBAC Admin/Partner, Session Isolation | 2.0 Jam |
| **Tahap 5** | Design System & Shared Layout | Shell Layout, Navbar Responsif, Toast, Skeleton, Hackathon Banner | 1.5 Jam |
| **Tahap 6** | Ingesti BMKG & Karantina Anti-Hoaks | Proxy BMKG, Normalisasi Data, Karantina `pending_verification`, Verifikasi Admin | 2.5 Jam |
| **Tahap 7** | Manajemen Mitra & Penugasan Wajib | Admin Partner Creation via Admin SDK, Dropdown Penugasan Wajib Bencana | 1.5 Jam |
| **Tahap 8** | Donasi QRIS Duitku Direct API | Fee 0.17%, Inquiry Invoice Duitku `SP`, Render QR, Webhook HMAC, Idempotensi | 3.0 Jam |
| **Tahap 9** | Pencairan Dana Atomik (Disbursement) | Ledger Saldo, `runTransaction()` Firestore, Otorisasi Admin, Pencegahan Defisit | 2.0 Jam |
| **Tahap 10** | Pelaporan 6 Milestone Mitra & Media | Konfirmasi Dana Mitra, 6-Step Stepper Logistik, Upload Cloudinary Terverifikasi | 2.5 Jam |
| **Tahap 11** | Timeline Kolektif & Laporan LPJ Final | Timeline Bencana Publik, Penutupan Kampanye (`archived`), Laporan Pertanggungjawaban | 2.0 Jam |
| **Tahap 12** | Hardening, Audit E2E & Deployment | Error Boundaries, Pengujian Skrip QA, Vercel Serverless Config | 2.0 Jam |

---

## 3. Rincian Teknis Tahap demi Tahap

### Tahap 1: Inisialisasi Proyek, Tooling & Lingkungan Pengembangan
- **Tujuan Utama**: Membentuk kerangka repositori fullstack monolitik TypeScript terpadu (frontend Vite SPA + backend Express serverless-ready).
- **Alasan**: Fondasi konfigurasi build, module resolution ES Modules (`"type": "module"`), dan dependensi harus selaras sebelum kode ditulis.
- **Prasyarat**: Node.js 22.x LTS terpasang.
- **Tugas Implementasi**:
  1. Buat `package.json` dengan scripts: `dev` (`tsx server/app.ts`), `build` (`vite build`), `lint` (`tsc --noEmit`).
  2. Pasang dependensi inti:
     - Runtime Frontend: `react@19`, `react-dom@19`, `react-router-dom@7`, `lucide-react`, `motion` (opsional UI).
     - Runtime Backend: `express@4`, `dotenv`, `firebase-admin@14`.
     - Runtime Database & Gateway: `firebase@12`.
     - Dev / Tooling: `typescript@7`, `vite@8`, `@vitejs/plugin-react@6`, `@tailwindcss/vite@4`, `tailwindcss@4`, `tsx@4`, `@types/express`, `@types/node`, `@types/react`.
  3. Konfigurasi `tsconfig.json` dengan `moduleResolution: "bundler"` atau `"node16"` serta `target: "ES2022"`.
  4. Konfigurasi `vite.config.ts` memuat plugin `@vitejs/plugin-react` dan `@tailwindcss/vite`.
  5. Konfigurasi `.env.example` membedakan variabel frontend ber-prefiks `VITE_` (`VITE_FIREBASE_API_KEY`, dsb.) dan rahasia backend (`DUITKU_API_KEY`, `CLOUDINARY_API_SECRET`, `FIREBASE_ADMIN_*`).
- **Verifikasi**: Jalankan `npm run lint` dan pastikan konfigurasi build tidak menghasilkan galat syntax.

---

### Tahap 2: Fondasi Data, Firestore Schema & Security Rules
- **Tujuan Utama**: Mendefinisikan seluruh tipe data statis TypeScript dan aturan keamanan Firestore sebelum fitur UI atau endpoint mengakses database.
- **Alasan**: Mencegah kebocoran data, melindungi isolasi donasi privat, dan memastikan struktur dokumen konsisten.
- **Prasyarat**: Tahap 1.
- **Tugas Implementasi**:
  1. Buat `src/types/index.ts`:
     - Tipe pengguna: `UserRole` (`'user' | 'admin' | 'partner'`), `UserProfile`.
     - Tipe bencana: `DisasterStatus` (`'pending_verification' | 'admin_approved' | 'auto_approved' | 'rejected' | 'published' | 'archived'`), `Disaster`, `EarthquakeEvent`.
     - Tipe donasi & pembayaran: `DonationStatus`, `Donation`, `PaymentStatus`, `PaymentRecord`.
     - Tipe pencairan & mitra: `DisbursementStatus`, `Disbursement`, `Partner`, `PartnerAllocation`, `DistributionMilestoneKey`.
     - Tipe pelaporan & timeline: `DistributionReport`, `TrackingEvent`, `DisasterTimelineEvent`, `FundraisingSummary`, `FundraisingReport`.
  2. Buat `src/lib/firestore-errors.ts`:
     - Helper penanganan error izin Firestore (`permission-denied`, `not-found`, dll.).
  3. Buat `src/lib/fees.ts`:
     - Konstanta `ADMIN_FEE_RATE = 0.0017` (0,17%).
     - Fungsi `calculateAdminFee()`, `calculateTotalPayment()`, `MIN_WITHDRAWAL = 1_000_000`, `maxWithdrawableAmount()`.
  4. Buat `firestore.rules`:
     - Fungsi helper: `isAuthenticated()`, `getUserData()`, `isAdmin()`, `isPartner()`, `isUser()`.
     - Default deny: `match /{document=**} { allow read, write: if false; }`.
     - Aturan koleksi:
       * `users`: Baca mandiri atau admin/partner; tulis mandiri.
       * `earthquakeEvents`: Baca publik; tulis hanya admin (via Admin SDK).
       * `disasters`: Baca publik hanya status `admin_approved`, `auto_approved`, `published`, `archived`; tulis admin/partner.
       * `donations` & `payments`: Baca/tulis hanya pemilik (`userId == request.auth.uid`), admin, atau partner.
       * `disbursements`: Baca user terautentikasi (admin/partner); tulis admin.
       * `partners`: Baca publik; tulis admin.
       * `disasterTimeline/{disasterId}/events/{eventId}`: Baca publik; tulis admin/partner.
- **Verifikasi**: Periksa sintaks `firestore.rules` dan pastikan tidak ada celah baca bebas pada donasi privat atau data bencana berstatus `pending_verification`.

---

### Tahap 3: Arsitektur Backend Server & Integrasi Polyfill
- **Tujuan Utama**: Membangun server Express monolitik yang dapat menyajikan middleware Vite saat pengembangan lokal serta bertindak sebagai Vercel Serverless Function saat produksi.
- **Alasan**: Frontend dan backend berjalan dalam domain yang sama untuk menghindari isu CORS pada webhook dan API proxy.
- **Prasyarat**: Tahap 1, Tahap 2.
- **Tugas Implementasi**:
  1. Buat `src/config/firebase.ts`:
     - Inisialisasi Firebase Client SDK (`initializeApp`, `getAuth`, `getFirestore`).
  2. Buat `src/config/firebase-admin.ts`:
     - Inisialisasi Firebase Admin SDK secara aman melalui variabel lingkungan service account.
  3. Buat `server/app.ts`:
     - Polyfill `global.fetch` dengan header `Referer` untuk mendukung pembatasan HTTP referrer Firebase API key di Node.js.
     - Body parser JSON dengan limit `10mb`.
     - Routing Vite dev server (`vite.middlewares`) pada mode non-produksi.
     - Routing statis `dist/index.html` pada mode produksi.
     - Listener port `0.0.0.0:3005`.
  4. Buat `api/index.ts`:
     - Ekspor instance `app` Express untuk Vercel Serverless handler dengan fallback 404 JSON (mencegah kembalian HTML pada error API).
- **Verifikasi**: Jalankan `npm run dev`, akses `http://localhost:3005/api/health` atau endpoint dasar, dan pastikan server menyala tanpa error.

---

### Tahap 4: Sistem Autentikasi Multirole & Session Management
- **Tujuan Utama**: Mengisolasi sesi Donatur Publik (Google Auth), Administrator, dan Mitra Lapangan dengan penanganan hak akses yang tegas.
- **Alasan**: Mencegah sesi staf tertinggal di browser donatur yang dapat memicu galat otorisasi Firestore.
- **Prasyarat**: Tahap 2, Tahap 3.
- **Tugas Implementasi**:
  1. Buat `src/lib/safe-storage.ts`:
     - Wrapper aman untuk `localStorage` dan `sessionStorage` dengan penanganan kuota dan mode penyamaran (*incognito*).
  2. Buat `src/services/firebase/auth.ts`:
     - `loginWithGoogle()`, `logout()`, `subscribeAuthState()`, `syncUserProfile()`.
     - Fungsi pendukung email internal: `staffRoleForEmail()`.
  3. Buat `src/features/auth/AuthContext.tsx`:
     - Memisahkan state `user` (Google user) dan `staffSession` (Admin / Partner session).
     - Rekonsiliasi otomatis: jika akun aktif bukan email staf, bersihkan `staffSession`.
     - Fungsi `loginStaff()`, `logoutStaff()`, `quickFillCredential()`.
  4. Buat antarmuka UI:
     - `src/features/auth/UserLoginPage.tsx`: Halaman masuk Donatur via Google Popup.
     - `src/features/admin/AdminAuthPage.tsx`: Halaman masuk khusus Administrator.
     - `src/features/partner/PartnerAuthPage.tsx`: Halaman masuk khusus Mitra Lapangan.
- **Verifikasi**: Masuk sebagai akun pengguna biasa, pastikan tidak dapat mengakses state `isAdminAuthenticated` atau `isPartnerAuthenticated`.

---

### Tahap 5: Desain Sistem Frontend, Layout Responsif & Shared UI Components
- **Tujuan Utama**: Membangun fondasi visual modern (glassmorphism, micro-interactions, navigasi adaptif) yang konsisten di semua resolusi layar.
- **Alasan**: Tampilan antarmuka yang siap demo membutuhkan struktur navigasi, notifikasi toast, dan skeleton loading yang kokoh sebelum modul fitur dipasang.
- **Prasyarat**: Tahap 4.
- **Tugas Implementasi**:
  1. Buat utilitas styling di `src/lib/utils.ts`:
     - Helper format mata uang rupiah (`formatRupiah`), format tanggal Indonesia, kalkulasi persentase.
  2. Buat komponen umpan balik visual:
     - `src/components/feedback/Toast.tsx`: ToastContext penyedia notifikasi sukses, error, dan info.
     - `src/components/feedback/Skeleton.tsx`: CardSkeleton untuk *loading state* kartu bencana dan tabel.
  3. Buat komponen tata letak:
     - `src/components/layout/WideNavbar.tsx`: Navbar adaptif dengan tautan menu publik, tombol login dinamis, dan indikator peran.
     - `src/components/layout/WideFooter.tsx`: Footer transparan dengan informasi kontak dan tautan kebijakan.
     - `src/components/layout/HackathonBanner.tsx`: Banner penanda lingkungan demo penjurian hackathon.
  4. Buat halaman publik statis:
     - `src/features/public/FaqPage.tsx`, `TermsPage.tsx`, `RefundPolicyPage.tsx`, `ContactPage.tsx`.
- **Verifikasi**: Tampilkan shell halaman kosong di browser desktop dan mobile (viewport 360px), pastikan layout tidak mengalami overflow horizontal.

---

### Tahap 6: Ingesti Data BMKG, Karantina Anti-Hoaks & Verifikasi Bencana Admin
- **Tujuan Utama**: Menarik data gempabumi resmi BMKG ke antrean karantina draft internal dan memfasilitasi telaah admin sebelum dipublikasikan ke publik.
- **Alasan**: Mematuhi aturan permanen: data BMKG adalah data seismik mentah dan **DILARANG OTOMATIS TAYANG** ke katalog donasi donatur.
- **Prasyarat**: Tahap 3, Tahap 4, Tahap 5.
- **Tugas Implementasi**:
  1. Buat modul parser BMKG di `src/services/bmkg.ts`:
     - Normalisasi payload JSON BMKG (`autogempa.json` dan `gempaterkini.json`) menjadi format `EarthquakeEvent` dan kandidat `Disaster`.
  2. Buat endpoint server di `server/routes/bmkg.ts`:
     - `GET /api/bmkg/autogempa`: Proxy data gempa terkini ber-timeout 8 detik.
     - `GET /api/bmkg/gempaterkini`: Proxy daftar 15 gempa terbaru.
     - `POST /api/bmkg/refresh`: Ingesti sisi server menggunakan Firebase Admin SDK. Menulis ke `earthquakeEvents` dan menyimpan ke `disasters` dengan status wajib `pending_verification`.
  3. Buat antarmuka Administrator:
     - `src/features/disaster/BMKGVerificationCard.tsx`: Kartu telaah bencana. Menampilkan magnitudo, kedalaman, peta koordinat, dan dropdown pemilihan mitra. Tombol "Approve & Publish" **wajib dinonaktifkan** jika belum ada mitra yang dipilih.
  4. Buat antarmuka Donatur:
     - `src/features/disaster/WideDisasterDashboard.tsx`: Menampilkan katalog bencana dengan query filter ketat `status == 'admin_approved'`. Jika belum ada bencana yang disetujui, tampilkan *empty state* yang informatif.
     - `src/features/disaster/KatalogBMKGPage.tsx` & `SituationAnalysisPage.tsx`: Peta seismik visual dan analisis heuristik dampak bencana.
- **Verifikasi**: Jalankan refresh BMKG, periksa database Firestore bahwa dokumen baru berstatus `pending_verification` dan **tidak muncul** pada dashboard donatur sampai admin mengeklik persetujuan.

---

### Tahap 7: Manajemen Mitra Lapangan Terakreditasi & Penugasan Wajib
- **Tujuan Utama**: Membangun alur pengelolaan akun mitra lapangan terisolasi dan validasi pengikatan mitra pada setiap bencana aktif.
- **Alasan**: Bencana yang dibuka untuk donasi harus memiliki entitas hukum/organisasi relawan penanggung jawab lapangan yang sah.
- **Prasyarat**: Tahap 6.
- **Tugas Implementasi**:
  1. Buat endpoint pembuatan mitra di `server/routes/admin.ts`:
     - `POST /api/admin/create-partner`: Memverifikasi token admin, membuat pengguna di Firebase Auth (`adminAuth.createUser`), membuat dokumen di `users` dengan `role: 'partner'`, dan menyimpan profil di koleksi `partners`.
  2. Buat antarmuka Admin:
     - `src/features/partner/AdminPartnersView.tsx`: Formulir pembuatan akun mitra baru, tabel direktori mitra aktif, dan statistik verifikasi.
  3. Validasi penugasan mitra:
     - Pada `BMKGVerificationCard.tsx` dan `server/routes/fundraising.ts`, validasi bahwa field `partnerId` dan `partnerName` wajib terisi saat proses persetujuan bencana berlangsung.
- **Verifikasi**: Buat satu akun mitra via Admin Portal, pastikan mitra muncul di dropdown penugasan bencana dan data kredensial tersimpan aman di Firebase Auth tanpa mengekspos password di Firestore.

---

### Tahap 8: Gateway Pembayaran Donasi QRIS Duitku Direct API & Idempotensi Webhook
- **Tujuan Utama**: Memfasilitasi pembayaran donasi instan melalui QRIS nasional dengan kalkulasi biaya transparan, validasi tanda tangan HMAC-SHA256, dan pencegahan duplikasi pencatatan transaksi.
- **Alasan**: Integritas keuangan platform bergantung pada validitas webhook gateway pembayaran.
- **Prasyarat**: Tahap 2, Tahap 3, Tahap 6.
- **Tugas Implementasi**:
  1. Buat endpoint pembayaran di `server/routes/payments.ts`:
     - `POST /api/payments/duitku/create`:
       * Validasi nominal minimum (Rp10.000) dan metode `SP` (ShopeePay / QRIS).
       * Hitung biaya admin 0,17% via `src/lib/fees.ts` (ditagihkan di atas donasi).
       * Request inquiry ke Duitku Direct API Sandbox (`/inquiry`) dan kembalikan `qrString` serta rincian biaya.
     - `POST /api/payments/duitku/callback`:
       * Verifikasi signature HMAC-SHA256 (`merchantCode + amount + merchantOrderId` dengan `DUITKU_API_KEY`).
       * **Pemeriksaan Idempotensi**: Jika dokumen `payments` untuk `donationId` tersebut sudah berstatus `paid`, langsung balas sukses tanpa memutasi ulang saldo kampanye.
       * Jika valid dan sukses: mutasi atomik batch Firestore (`payments.status = 'paid'`, `donations.status = 'paid'`, buat event `trackingEvents`).
     - `POST /api/payments/duitku/check-status`:
       * Polling status pembayaran langsung ke Duitku untuk memperbarui status donatur secara instan di antarmuka klien.
  2. Buat alur antarmuka donasi:
     - `src/features/donation/TransactionDonatePage.tsx`: Pemilihan nominal donasi, transparansi rincian biaya admin (0,17%), dan input data donatur.
     - `src/features/donation/TransactionCheckoutPage.tsx`: Render QRIS interaktif dari `qrString`, hitung mundur batas kedaluwarsa (60 menit), dan polling status otomatis.
     - `src/features/donation/TransactionStatusPage.tsx`: Bukti pembayaran sah dan tautan ke riwayat donasi.
     - `src/features/donation/MyDonationsPage.tsx`: Riwayat donasi donatur terisolasi berdasarkan UID akun Google aktif.
- **Verifikasi**: Simulasikan pembayaran donasi di sandbox Duitku, kirim callback duplikat dengan payload yang sama, dan pastikan saldo kampanye tidak bertambah dua kali.

---

### Tahap 9: Otorisasi Pencairan Dana Atomik (Disbursement Manager) & Ledger Keuangan
- **Tujuan Utama**: Mengontrol proses pencairan dana dari saldo donasi terkumpul ke rekening mitra operasional lapangan dengan validasi transaksi atomik.
- **Alasan**: Mencegah pencairan dana melebihi saldo terkumpul (*overdraw*) dan mencatat seluruh mutasi kas keluar secara transparan.
- **Prasyarat**: Tahap 7, Tahap 8.
- **Tugas Implementasi**:
  1. Buat endpoint pencairan dana di `server/routes/fundraising.ts`:
     - `GET /api/fundraising/summary`:
       * Menghitung sumber kebenaran saldo per bencana secara real-time dari seluruh donasi berstatus `paid` dikurangi total pencairan berstatus `success` dan `submitted`.
     - `POST /api/fundraising/admin/disbursements`:
       * Verifikasi token admin.
       * Validasi batas nominal pencairan terhadap formula `maxWithdrawableAmount(remaining)`.
       * Jalankan `db.runTransaction()` atomik:
         1. Simpan dokumen `disbursements` (status: `'submitted'`).
         2. Simpan dokumen `partnerAllocations` (status: `'allocated'`).
         3. Catat entri ke `auditLogs`.
         4. Tambahkan event kolektif ke subkoleksi `disasterTimeline`.
  2. Buat antarmuka Administrator:
     - `src/features/finance/DisbursementManager.tsx`: Ringkasan kas tersedia per bencana, formulir pencairan dana, kalkulator estimasi biaya transfer, dan tabel riwayat pencairan.
- **Verifikasi**: Uji permohonan pencairan dengan nominal yang melebihi saldo kas tersedia; pastikan server melempar error validasi dan menolak mutasi database.

---

### Tahap 10: Pelaporan 6 Milestone Mitra Lapangan & Integrasi Cloudinary
- **Tujuan Utama**: Memfasilitasi mitra lapangan untuk mengonfirmasi penerimaan dana dan memperbarui 6 tahapan penyaluran bantuan beserta bukti foto dan geolokasi.
- **Alasan**: Menghilangkan fenomena *black box donation* dengan menyajikan bukti logistik bertahap yang dapat diverifikasi publik.
- **Prasyarat**: Tahap 9.
- **Tugas Implementasi**:
  1. Buat endpoint tanda tangan unggah media di `server/routes/images.ts`:
     - `POST /api/images/sign`: Mengeluarkan tanda tangan SHA-1 Cloudinary berbatas waktu khusus untuk folder yang diizinkan (`bersamakita/reports`, `evidence`, `partners`) hanya bagi pengguna dengan peran admin atau partner.
  2. Buat klien pengunggah media di `src/services/cloudinary.ts`:
     - Validasi batas ukuran file (maksimal 5 MB), tipe file (`jpg`, `png`, `webp`), dan pengiriman langsung via `XMLHttpRequest` berindikator progres.
  3. Buat antarmuka Mitra Lapangan:
     - `src/features/partner/PartnerDashboardView.tsx`: Dashboard tugas operasional mitra.
     - `src/features/distribution/DistributionProgressCard.tsx`:
       * Tab konfirmasi penerimaan dana transfer.
       * Stepper 6 Milestone:
         1. `funds_received` (Dana Diterima)
         2. `goods_packed` (Pengemasan Sembako / Logistik Medis)
         3. `in_transit` (Armada Bergerak ke Lokasi Bencana)
         4. `arrived_at_posko` (Bantuan Tiba di Posko Induk)
         5. `handed_over` (Serah Terima Langsung ke Penyintas)
         6. `completed` (Penyaluran Tuntas)
       * Setiap langkah meminta input keterangan posko, geolokasi, dan bukti foto unggahan Cloudinary.
- **Verifikasi**: Masuk sebagai mitra, lakukan pembaruan milestone ke tahap 2 beserta foto bukti, dan pastikan data tersimpan ke `partnerAllocations` dan memicu event di `disasterTimeline`.

---

### Tahap 11: Timeline Bencana Kolektif Publik & Laporan Pertanggungjawaban Final (LPJ)
- **Tujuan Utama**: Menampilkan garis waktu kolektif bagi donatur serta memfasilitasi admin untuk menutup kampanye dan mempublikasikan Laporan Pertanggungjawaban (LPJ).
- **Alasan**: Semua donatur berhak melihat perkembangan distribusi bantuan secara komprehensif tanpa mengekspos data pribadi donatur lainnya.
- **Prasyarat**: Tahap 10.
- **Tugas Implementasi**:
  1. Buat endpoint laporan akhir di `server/routes/fundraising.ts`:
     - `GET /api/fundraising/report/:disasterId`: Menghasilkan rekapitulasi komprehensif data keuangan riil (total donasi masuk, potongan admin, total dana disalurkan, jumlah penerima manfaat, dan riwayat timeline).
     - `POST /api/fundraising/admin/close`: Mengubah status bencana menjadi `'archived'`, merekam event penutupan di audit log, dan menerbitkan event final di timeline.
  2. Buat antarmuka Laporan & Transparansi:
     - `src/features/distribution/DisasterTimelineSection.tsx`: Komponen garis waktu interaktif kronologis per bencana.
     - `src/features/distribution/FinalReportSection.tsx`: Tampilan LPJ publik berisikan ringkasan angka, daftar pengeluaran posko, dan galeri foto penyerahan.
     - `src/features/distribution/TransparansiReportsPage.tsx`: Halaman arsip transparansi bagi publik.
     - `src/features/distribution/AdminFinalReportPanel.tsx`: Panel admin untuk meninjau dan mengeksekusi penutupan kampanye.
- **Verifikasi**: Buka halaman bencana yang telah diarsipkan, pastikan status donasi ditutup dan dokumen LPJ dapat diakses publik secara lengkap.

---

### Tahap 12: Pengujian End-to-End, Hardening Keamanan & Deployment Produksi
- **Tujuan Utama**: Memastikan seluruh alur teruji tanpa celah logika, tidak ada kebocoran rahasia lingkungan, dan aplikasi siap dideploy ke Vercel dan Firebase.
- **Alasan**: Menjamin kelancaran demonstrasi langsung di hadapan dewan juri hackathon.
- **Prasyarat**: Tahap 1 hingga Tahap 11.
- **Tugas Implementasi**:
  1. Audit keamanan variabel lingkungan:
     - Pastikan tidak ada kredensial backend (`DUITKU_API_KEY`, service account) yang memakai prefiks `VITE_`.
  2. Konfigurasi `vercel.json`:
     - Pengalihan rute `/api/(.*)` ke serverless handler `api/index.ts`.
     - Pengalihan rute SPA `/(.*)` ke `index.html`.
  3. Konfigurasi `firebase.json` dan indeks Firestore di `firestore.indexes.json`:
     - Definisikan indeks gabungan untuk koleksi `donations` (`userId` + `createdAt DESC`) dan `disasters` (`status` + `createdAt DESC`).
  4. Jalankan validasi skrip:
     - Jalankan `npm run lint` (`tsc --noEmit`) untuk memastikan zero type errors.
     - Jalankan `npm run build` untuk memverifikasi bundle asset Vite.
- **Verifikasi**: Lakukan uji coba skenario demo lengkap (Ingesti BMKG -> Review Admin -> Donasi QRIS -> Pencairan Dana -> Update Mitra -> LPJ Final) pada URL deployment produksi.

---

## 4. Pemetaan Alur Bisnis Inti (Business Workflow Mapping)

### 4.1 Alur Pengelolaan & Verifikasi Bencana (Disaster Lifecycle)
```
[BMKG Open Data API]
        │
        ▼ (HTTP GET via Express Proxy: /api/bmkg/refresh)
[Firestore: 'disasters'] (Status: 'pending_verification')
        │
        ▼ (TAMPIL HANYA DI ADMIN PORTAL)
[Admin Portal: BMKGVerificationCard]
        │
        ├─► Admin telaah parameter gempa & kelayakan posko
        ├─► Admin WAJIB memilih Mitra Lapangan (Partner Assignment)
        │
        ▼ (Admin klik "Approve & Assign Partner")
[Firestore: 'disasters'] (Status: 'admin_approved')
        │
        ▼
[Katalog Publik: WideDisasterDashboard] (Bencana Aktif untuk Donasi)
```

### 4.2 Alur Transaksi Donasi & Webhook QRIS (Donation & Payment Lifecycle)
```
[Donatur di Halaman Donasi]
        │
        ▼ (Pilih nominal + biaya admin transparan 0,17%)
[Express Backend: POST /api/payments/duitku/create]
        │
        ▼ (Inquiry ke Duitku Sandbox Direct API - Method 'SP')
[Halaman Checkout: TransactionCheckoutPage]
        │
        ├─► Render QRIS dari qrString
        ├─► Polling status ke /api/payments/duitku/check-status
        │
        ▼ (Donatur memindai & membayar via Mobile Banking/E-Wallet)
[Duitku Webhook: POST /api/payments/duitku/callback]
        │
        ├─► 1. Verifikasi Signature HMAC-SHA256
        ├─► 2. Cek Idempotensi (Jika sudah PAID, langsung return 200)
        ├─► 3. Batch Firestore Update via Admin SDK:
        │      - payments: status = 'paid'
        │      - donations: status = 'paid'
        │      - trackingEvents: tambahkan event 'funds_recorded'
        │
        ▼
[Frontend Mendeteksi Status PAID] ──► Tampilkan Bukti Sukses di TransactionStatusPage
```

### 4.3 Alur Pencairan, Distribusi Logistik & Pelaporan (Disbursement & Logistics)
```
[Saldo Donasi Terkumpul di Kampanye Bencana]
        │
        ▼ (Admin buka DisbursementManager)
[Express Backend: POST /api/fundraising/admin/disbursements]
        │
        ├─► Validasi saldo atomik db.runTransaction()
        ├─► Catat pencairan di 'disbursements' (status: 'submitted')
        ├─► Catat alokasi di 'partnerAllocations' (status: 'allocated')
        ├─► Rekam event ke 'disasterTimeline'
        │
        ▼ (Admin transfer dana ke rekening operasional mitra)
[Mitra Login ke PartnerDashboardView]
        │
        ├─► Mitra konfirmasi penerimaan dana (status -> 'funds_received')
        │
        ▼ (Mitra memperbarui 6 tahapan distribusi secara berkala)
[Proses 6 Milestone Distribusi di Posko]
        │
        ├─► Unggah foto bukti dokumentasi ke Cloudinary CDN
        ├─► Catat lokasi posko dan rincian bantuan yang diserahkan
        ├─► Pembaruan otomatis tercatat di timeline publik donatur
        │
        ▼ (Setelah Milestone 6 tuntas)
[Admin Portal: AdminFinalReportPanel]
        │
        ▼ (Admin klik "Tutup Kampanye & Publikasikan LPJ")
[Firestore: 'disasters'] (Status: 'archived') ──► Laporan LPJ Terbit di Transparansi
```

---

## 5. Ringkasan Kesiapan & Langkah Lanjutan

Rencana implementasi di atas memetakan seluruh arsitektur secara runtut dan bebas dari kontradiksi bisnis. Dokumen pendukung lanjutan (peta file, rencana commit, jadwal 24 jam, grafik dependensi, dan kriteria penerimaan) disusun secara konsisten mengacu pada tahapan 1 sampai 12 ini.
