# Kriteria Penerimaan & Skenario Pengujian (Acceptance Criteria & Test Scenarios)

Dokumen ini mendefinisikan kriteria penerimaan teknis (*Acceptance Criteria*) per tahapan implementasi serta skenario pengujian menyeluruh (*End-to-End Test Scenarios*) untuk memvalidasi platform **Bersama Kita**. Kriteria ini dirancang agar dapat diuji secara objektif oleh tim pengembang maupun dewan juri hackathon nasional.

---

## 1. Kriteria Penerimaan per Tahap Implementasi (Stage-by-Stage Acceptance Criteria)

### Tahap 1: Inisialisasi Proyek, Tooling & Lingkungan
- **Prasyarat**: Node.js 22 LTS terpasang.
- **Prosedur Pengujian**:
  1. Jalankan `npm install`.
  2. Jalankan `npm run lint` (`tsc --noEmit`).
  3. Jalankan `npm run build`.
- **Kriteria Lolos (PASS)**:
  * Dependensi terpasang tanpa konflik versi peer-dependencies.
  * Kompilasi TypeScript menghasilkan **0 error**.
  * Bundler Vite menghasilkan folder `dist/` dengan aset statis yang teroptimasi.

---

### Tahap 2: Model Data, Rumus Biaya & Aturan Firestore
- **Prasyarat**: Berkas `src/types/index.ts`, `src/lib/fees.ts`, dan `firestore.rules` tersedia.
- **Prosedur Pengujian**:
  1. Uji unit formula kalkulasi biaya admin 0,17%:
     - Input Rp100.000 -> Biaya Admin: Rp170, Total Bayar: Rp100.170.
     - Input Rp50.000 -> Biaya Admin: Rp85, Total Bayar: Rp50.085.
  2. Uji aturan Firestore via Firebase Emulator atau unit test:
     - Request baca dokumen `disasters` berstatus `pending_verification` oleh pengguna anonim/tamu wajib **DITOLAK (Permission Denied)**.
     - Request baca donasi pengguna A oleh pengguna B wajib **DITOLAK**.
- **Kriteria Lolos (PASS)**:
  * Rumus pembagian biaya transparan 0,17% presisi hingga satuan rupiah terkecil.
  * Aturan Firestore menolak seluruh pembacaan data privat dan status draft publik.

---

### Tahap 3: Backend Express & Serverless Entrypoint
- **Prasyarat**: Variabel lingkungan `.env` terkonfigurasi.
- **Prosedur Pengujian**:
  1. Jalankan `npm run dev`.
  2. Akses `http://localhost:3005` melalui browser.
  3. Kirim request `GET http://localhost:3005/api/unknown-endpoint`.
- **Kriteria Lolos (PASS)**:
  * Server Express menyala di port 3005 dan menyajikan Vite dev server.
  * Request API tidak dikenal mengembalikan JSON 404 (`{ "success": false, "message": "Endpoint not found" }`), bukan berkas HTML.

---

### Tahap 4: Autentikasi Multirole & Isolasi Sesi
- **Prasyarat**: Konfigurasi Firebase Auth aktif.
- **Prosedur Pengujian**:
  1. Lakukan login Donatur via Google Popup di `/auth/login`.
  2. Buka DevTools Application tab, periksa `localStorage`.
  3. Lakukan login Admin di `/admin/auth` dengan kredensial staf.
  4. Lakukan logout staf dan login kembali sebagai Google user biasa.
- **Kriteria Lolos (PASS)**:
  * Profil pengguna tersinkronisasi ke koleksi `users`.
  * Sesi staf admin terisolasi dan **otomatis dibersihkan** dari penyimpanan lokal jika pengguna aktif bukan akun staf.

---

### Tahap 5: UI Shell, Desain Sistem & Shared Components
- **Prasyarat**: Komponen layout dan Tailwind CSS v4 aktif.
- **Prosedur Pengujian**:
  1. Buka halaman beranda `/` pada resolusi desktop (1920x1080) dan mobile (360x800).
  2. Pemicu notifikasi Toast: `showToast('Tes Notifikasi', 'success')`.
- **Kriteria Lolos (PASS)**:
  * Tidak ada overflow horizontal (tidak ada scroll horizontal liar pada layar ponsel).
  * Menu hamburger mobile berfungsi membuka dan menutup navigasi.
  * Toast muncul di sudut layar dan otomatis menghilang setelah durasi timeout.

---

### Tahap 6: Ingesti Data BMKG & Karantina Bencana Draft
- **Prasyarat**: Endpoint `/api/bmkg/refresh` aktif.
- **Prosedur Pengujian**:
  1. Kirim `POST /api/bmkg/refresh` dengan Authorization header Bearer token.
  2. Periksa koleksi `disasters` di Firestore.
  3. Buka halaman katalog donasi publik `/dashboard`.
- **Kriteria Lolos (PASS)**:
  * Data gempa terbaru tersimpan dengan status `pending_verification`.
  * Halaman donatur publik menampilkan **Empty State** (bencana pending tidak bocor ke publik).

---

### Tahap 7: Manajemen Mitra & Penugasan Bencana
- **Prasyarat**: Endpoint `/api/admin/create-partner` aktif.
- **Prosedur Pengujian**:
  1. Admin membuat akun mitra baru melalui Admin Portal.
  2. Buka kartu verifikasi bencana BMKG di portal admin.
  3. Coba klik tombol "Approve & Publish" tanpa memilih mitra lapangan.
  4. Pilih salah satu mitra, lalu klik "Approve & Publish".
- **Kriteria Lolos (PASS)**:
  * Tombol persetujuan dalam kondisi *disabled* sebelum mitra dipilih.
  * Setelah persetujuan, bencana berubah status menjadi `admin_approved` dan field `partnerId` terisi sah.

---

### Tahap 8: Transaksi Donasi QRIS Duitku & Webhook Idempotensi
- **Prasyarat**: Akun Duitku Sandbox aktif.
- **Prosedur Pengujian**:
  1. Donatur memilih bencana dan nominal Rp50.000 di `/transaction/donate/:disasterId`.
  2. Sistem me-render gambar QRIS di `/transaction/checkout/:donationId`.
  3. Pemicu callback webhook `POST /api/payments/duitku/callback` dengan `resultCode: '00'` dan signature HMAC-SHA256 valid.
  4. Kirim ulang callback yang identik untuk kedua kalinya (*duplicate callback*).
- **Kriteria Lolos (PASS)**:
  * QRIS ter-render jelas dan timer hitung mundur 60 menit berjalan.
  * Callback pertama memperbarui `payments.status = 'paid'`, `donations.status = 'paid'`, dan menambah saldo kas bencana.
  * Callback kedua langsung merespon HTTP 200 sukses **tanpa menambah saldo kampanye lagi** (idempoten).

---

### Tahap 9: Otorisasi Pencairan Dana Atomik (Disbursement Manager)
- **Prasyarat**: Terdapat saldo donasi berstatus `paid` pada bencana aktif.
- **Prosedur Pengujian**:
  1. Periksa saldo kas tersedia di `GET /api/fundraising/summary`.
  2. Ajukan pencairan dana sebesar nominal kas tersedia + Rp100.000 via Admin Portal.
  3. Ajukan pencairan dana dalam batas wajar (misal Rp1.000.000).
- **Kriteria Lolos (PASS)**:
  * Permohonan pencairan yang melebihi batas kas ditolak oleh transaksi atomik backend dengan pesan kesalahan saldo tidak cukup.
  * Permohonan yang sah berhasil membentuk dokumen `disbursements` (status: `submitted`) dan memotong saldo kas sisa.

---

### Tahap 10: Pelaporan 6 Milestone Mitra & Dokumentasi Cloudinary
- **Prasyarat**: Pencairan dana telah disetujui admin untuk mitra terkait.
- **Prosedur Pengujian**:
  1. Mitra login ke `/partner`, buka tab "Menunggu Konfirmasi", dan klik "Konfirmasi Penerimaan Dana".
  2. Buka kartu "Proses Distribusi Bantuan", unggah foto dokumentasi, dan ubah status ke Milestone 2 (`goods_packed`).
- **Kriteria Lolos (PASS)**:
  * Status pencairan berubah menjadi `funds_received`.
  * Foto terunggah langsung ke folder aman Cloudinary (`secure_url` valid).
  * Pembaruan milestone tercatat pada alokasi mitra dan memicu event ke `disasterTimeline`.

---

### Tahap 11: Timeline Kolektif Publik & Laporan LPJ Final
- **Prasyarat**: Bencana telah menyelesaikan seluruh tahapan distribusi.
- **Prosedur Pengujian**:
  1. Buka halaman detail bencana dan periksa bagian *Disaster Timeline*.
  2. Admin membuka *AdminFinalReportPanel* dan mengeklik "Tutup Kampanye & Publikasikan Laporan".
  3. Buka halaman `/dashboard/reports` sebagai publik.
- **Kriteria Lolos (PASS)**:
  * Seluruh garis waktu bantuan tampil secara kronologis dengan foto dan stempel waktu, **tanpa menampilkan alamat email atau nomor telepon donatur**.
  * Bencana beralih status menjadi `archived`.
  * Laporan LPJ memuat ringkasan kas masuk, kas keluar, dan bukti penerima manfaat yang balance 100%.

---

### Tahap 12: Deployment Produksi & Hardening
- **Prasyarat**: Deployment Vercel dan Firebase aktif.
- **Prosedur Pengujian**:
  1. Akses aplikasi melalui URL domain produksi Vercel.
  2. Lakukan audit console browser: tidak ada kunci rahasia (*secret keys*) yang bocor di bundle JavaScript.
- **Kriteria Lolos (PASS)**:
  * Rute frontend dan API serverless berfungsi normal di bawah protokol HTTPS.
  * Kunci rahasia seperti `DUITKU_API_KEY` dan `CLOUDINARY_API_SECRET` tidak terdapat di dalam berkas bundle klien.

---

## 2. Skenario Pengujian Kritis Menyeluruh (Critical End-to-End Test Scenarios)

Berikut adalah 8 skenario pengujian langsung yang wajib dijalankan untuk demonstrasi hackathon:

```
+----------------------------------------------------------------------------------------------------+
| SKENARIO 1: Staged Ingestion BMKG & Karantina Anti-Hoaks                                           |
+----------------------------------------------------------------------------------------------------+
| Tindakan Penguji : 1. Klik tombol "Refresh BMKG" di antarmuka donatur.                             |
|                    2. Periksa katalog donasi publik di halaman utama.                              |
|                    3. Buka Admin Portal di `/admin` dengan akun admin.                             |
| Hasil Diharapkan : - Katalog publik tetap menampilkan Empty State (0 bencana liar tayang).         |
|                    - Kartu verifikasi admin menampilkan data gempa baru dengan label:              |
|                      "Menunggu Verifikasi Admin (Status: pending_verification)".                   |
| Status Evaluasi  : [ PASS / FAIL ]                                                                 |
+----------------------------------------------------------------------------------------------------+

+----------------------------------------------------------------------------------------------------+
| SKENARIO 2: Mandatory Partner Assignment Guard Enforcement                                         |
+----------------------------------------------------------------------------------------------------+
| Tindakan Penguji : 1. Di kartu verifikasi admin, biarkan dropdown mitra dalam keadaan kosong.     |
|                    2. Klik tombol "Approve & Publish".                                             |
|                    3. Pilih "Palang Merah Indonesia" dari dropdown mitra, lalu klik Approve.       |
| Hasil Diharapkan : - Langkah 2: Tombol disabled atau sistem menolak approval (HTTP 400).           |
|                    - Langkah 3: Bencana berhasil disetujui dan seketika muncul di katalog publik.  |
| Status Evaluasi  : [ PASS / FAIL ]                                                                 |
+----------------------------------------------------------------------------------------------------+

+----------------------------------------------------------------------------------------------------+
| SKENARIO 3: Donasi QRIS, Validasi Signature Webhook & Idempotensi                                  |
+----------------------------------------------------------------------------------------------------+
| Tindakan Penguji : 1. Donatur memilih donasi Rp50.000 untuk bencana terverifikasi.                |
|                    2. Periksa rincian biaya pada layar: Rp50.000 + Biaya QRIS Rp85 = Rp50.085.     |
|                    3. Pindai kode QRIS sandbox dan picu webhook sukses dari simulator Duitku.      |
|                    4. Picu webhook yang sama untuk kedua kalinya.                                  |
| Hasil Diharapkan : - Layar checkout otomatis beralih ke TransactionStatusPage (Status: PAID).      |
|                    - Saldo kampanye bertambah tepat Rp50.000.                                      |
|                    - Webhook duplikat tidak menggandakan penambahan saldo kampanye.                |
| Status Evaluasi  : [ PASS / FAIL ]                                                                 |
+----------------------------------------------------------------------------------------------------+

+----------------------------------------------------------------------------------------------------+
| SKENARIO 4: Proteksi Saldo Atomik pada Pencairan Dana (Disbursement Manager)                       |
+----------------------------------------------------------------------------------------------------+
| Tindakan Penguji : 1. Admin membuka Disbursement Manager di Admin Portal.                          |
|                    2. Input nominal pencairan melebihi kas yang terkumpul.                         |
|                    3. Klik tombol ajukan pencairan.                                                |
| Hasil Diharapkan : - Backend melempar error: "Nominal melebihi maksimal pencairan kas".            |
|                    - Tidak ada dokumen pencairan baru yang terbentuk dan kas tetap utuh.           |
| Status Evaluasi  : [ PASS / FAIL ]                                                                 |
+----------------------------------------------------------------------------------------------------+

+----------------------------------------------------------------------------------------------------+
| SKENARIO 5: Konfirmasi Dana Mitra Lapangan & Pembaruan 6 Milestone Logistik                       |
+----------------------------------------------------------------------------------------------------+
| Tindakan Penguji : 1. Mitra login ke dashboard mitra di `/partner`.                               |
|                    2. Klik "Konfirmasi Penerimaan Dana" pada pencairan yang disetujui admin.       |
|                    3. Buka stepper distribusi, unggah foto sembako di posko, dan klik Selesai      |
|                       pada Milestone 2 (Pengemasan Sembako).                                       |
| Hasil Diharapkan : - Status pencairan berubah menjadi 'funds_received'.                            |
|                    - Foto terunggah ke Cloudinary CDN.                                             |
|                    - Timeline bencana mencatat: "Logistik Sembako Sedang Dikemas oleh Mitra".      |
| Status Evaluasi  : [ PASS / FAIL ]                                                                 |
+----------------------------------------------------------------------------------------------------+

+----------------------------------------------------------------------------------------------------+
| SKENARIO 6: Integritas Timeline Kolektif Publik & Perlindungan Data Pribadi                        |
+----------------------------------------------------------------------------------------------------+
| Tindakan Penguji : 1. Buka halaman detail bencana sebagai pengunjung tanpa login.                  |
|                    2. Buka tab "Lini Masa Bantuan & Pelacakan".                                    |
|                    3. Periksa seluruh entri kronologis yang tampil di layar.                       |
| Hasil Diharapkan : - Riwayat donasi, pencairan dana, dan milestone posko tampil kronologis.        |
|                    - Tidak ada email, nomor ponsel, atau identitas pribadi donatur yang bocor.     |
| Status Evaluasi  : [ PASS / FAIL ]                                                                 |
+----------------------------------------------------------------------------------------------------+

+----------------------------------------------------------------------------------------------------+
| SKENARIO 7: Penutupan Kampanye Bencana & Publikasi Laporan LPJ Final                               |
+----------------------------------------------------------------------------------------------------+
| Tindakan Penguji : 1. Admin membuka AdminFinalReportPanel setelah Milestone 6 selesai.             |
|                    2. Klik "Tutup Kampanye & Publikasikan Laporan".                                |
|                    3. Buka halaman publik transparansi di `/dashboard/reports`.                    |
| Hasil Diharapkan : - Status bencana berubah menjadi 'archived'.                                    |
|                    - Tautan donasi pada bencana tersebut terkunci dengan label "Penggalangan       |
|                      Dana Selesai".                                                                |
|                    - Dokumen LPJ publik terbit memuat neraca keuangan yang imbang (reconciled).     |
| Status Evaluasi  : [ PASS / FAIL ]                                                                 |
+----------------------------------------------------------------------------------------------------+

+----------------------------------------------------------------------------------------------------+
| SKENARIO 8: Responsivitas Tampilan Lintas Perangkat (Desktop vs Ponsel Pintar)                     |
+----------------------------------------------------------------------------------------------------+
| Tindakan Penguji : 1. Buka formulir donasi dan checkout QRIS pada ponsel layar 360px - 414px.      |
|                    2. Buka dashboard admin dan tabel transaksi pada monitor desktop 1080p.         |
| Hasil Diharapkan : - Pada layar ponsel: kode QRIS pas di tengah layar, tombol navigasi tidak       |
|                      terpotong, dan tidak ada elemen yang meluap ke samping (*no horizontal leak*). |
|                    - Pada desktop: dashboard menyajikan visualisasi multi-kolom yang proporsional. |
| Status Evaluasi  : [ PASS / FAIL ]                                                                 |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Matriks Keputusan Dewan Juri (Jury Evaluation Matrix)

| Kategori Evaluasi | Bobot | Kriteria Kelulusan Utama |
|---|---|---|
| **Integritas Alur Bencana** | 25% | Karantina data BMKG terbukti 100% efektif; tidak ada rilis tanpa mitra lapangan. |
| **Keamanan Transaksi Finansial** | 25% | QRIS berhasil di-scan; webhook HMAC-SHA256 menolak signature palsu & idempoten. |
| **Akuntabilitas & Transparansi** | 25% | Milestone 6 tahap berbukti foto valid; pencairan atomik mencegah defisit kas. |
| **Kualitas Rekayasa Perangkat Lunak** | 15% | Zero compile error TypeScript; kode modular; Firestore Security Rules terproteksi. |
| **Pengalaman Pengguna (UI/UX)** | 10% | Desain modern, responsif desktop/mobile, ramah pengguna, dan loading state mulus. |
