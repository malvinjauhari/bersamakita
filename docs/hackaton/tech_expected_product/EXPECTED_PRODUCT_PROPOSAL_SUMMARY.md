# Ringkasan Eksekutif Expected Product (Proposal-Ready Summary)
## Platform Tanggap Bencana & Transparansi Donasi "Bersama Kita"

**Bagian Siap Pakai untuk Proposal Hackathon Tingkat Nasional (Bab Expected Product)**  
*Bahasa: Indonesia Formal, Ringkas, Padat Data, dan Berorientasi Solusi*

---

### 1. Apa yang Dihasilkan Produk (What the Product Delivers)
**Bersama Kita** menghasilkan sebuah platform web tanggap bencana dan penggalangan donasi terintegrasi yang menyelesaikan tiga kelemahan mendasar sistem donasi konvensional: **maraknya kampanye fiktif/hoaks bencana**, **fenomena "Black Box Donation" (hilangnya jejak uang pasca-transfer)**, dan **keterputusan data kebencanaan resmi dengan aksi relawan lapangan**.

Produk akhir yang disajikan berupa aplikasi web responsif fungsional penuh (*fully working prototype*) yang menjembatani:
1. **Karantina Data Seismik BMKG**: Data gempa bumi terkini ditarik otomatis dari BMKG dan dikarantina secara internal—bencana tidak pernah tayang ke publik sebelum diverifikasi oleh administrator platform.
2. **Penugasan Wajib Mitra Lapangan (*Mandatory Partner Assignment*)**: Setiap bencana aktif wajib diikatkan kepada organisasi mitra lapangan resmi yang berbadan hukum sebelum donasi dapat dibuka.
3. **Gerbang Donasi QRIS Instan Transparan**: Fasilitasi donasi digital via QRIS (Duitku Direct API) dengan transparansi biaya admin 0,17% di atas donasi (100% donasi masuk utuh ke kas bencana).
4. **Pencairan Dana Berbasis Transaksi Atomik**: Penarikan kas penanganan bencana dilindungi oleh transaksi atomik database (`db.runTransaction()`) untuk mencegah defisit atau pengeluaran melebihi kas terkumpul (*anti-overdraw*).
5. **Pelaporan 6 Milestone Logistik Berbukti Visual**: Mitra lapangan posko melaporkan 6 tahapan penyaluran (*Dana Diterima -> Pengemasan Barang -> Dalam Pengiriman -> Tiba di Posko -> Penyerahan ke Warga -> Selesai*) dengan bukti foto dan geolokasi langsung ke Cloudinary CDN.
6. **Linimasa Kolektif Publik & Laporan Pertanggungjawaban (LPJ)**: Linimasa bantuan terbuka bagi publik dan donatur tanpa membocorkan data pribadi (*PII*) donatur lain, diakhiri dengan penerbitan LPJ neraca seimbang saat kampanye ditutup.

---

### 2. Sinergi Komponen Teknis Utama (How Components Work Together)
Sistem beroperasi melalui arsitektur terpadu **React 19 + Express Serverless + Google Cloud Firestore**:

```
[BMKG Open Data] ──► [Express Proxy /api/bmkg/refresh] ──► [Firestore: status 'pending_verification']
                                                                      │
                                                                      ▼ (Admin Review & Mitra Assignment)
[Katalog Publik Donatur] ◄── [Firestore: status 'admin_approved'] ◄───┘
          │
          ▼ (Donatur Pilih Nominal + Biaya 0,17%)
[Duitku Direct API QRIS] ──► [Scan QR & Bayar] ──► [Webhook HMAC-SHA256 & Idempotensi]
                                                                      │
                                                                      ▼ (Saldo Kas Terbentuk)
[Disbursement Manager] ──► [db.runTransaction() Atomik] ──► [Dana Dialokasikan ke Mitra]
                                                                      │
                                                                      ▼ (Mitra Posko Konfirmasi Dana)
[Stepper 6 Milestone] ──► [Upload Foto Cloudinary CDN] ──► [Linimasa Kolektif Publik]
                                                                      │
                                                                      ▼ (Distribusi Tuntas)
[Admin Tutup Kampanye] ──► [Status Bencana: 'archived'] ──► [Laporan LPJ Terbit di Transparansi]
```

---

### 3. Nilai Keunggulan Teknis yang Ditawarkan (Implementation Value)
1. **Zero Auto-Approval Gatekeeper**: Berbeda dari portal agregator biasa, sistem kami menerapkan gerbang isolasi data. Sekalipun gempa bumi terdeteksi oleh BMKG, kampanye tidak akan tayang secara liar sebelum admin memvalidasi kebutuhan posko dan menunjuk mitra pelaksana.
2. **Keamanan Transaksi Finansial Idempoten**: Penanganan webhook gerbang pembayaran dilengkapi validasi tanda tangan kriptografi HMAC-SHA256 dan perlindungan idempotensi. Panggilan webhook berulang dari jaringan tidak akan pernah menggandakan pencatatan donasi atau saldo kampanye (*zero double-crediting*).
3. **Pencatatan Finansial Tanpa Selisih Kas**: Rekapitulasi kas dihitung secara terpusat di backend dari data riil (*Admin SDK*). Operasi pencairan dana dibatasi secara mutlak oleh sisa kas riil melalui *ledger lock*, mengeliminasi risiko manipulasi angka dari sisi klien.
4. **Pelacakan Logistik Bertahap yang Dapat Diverifikasi**: Menghilangkan kecurigaan publik dengan menyajikan 6 tahapan logistik kronologis lengkap dengan foto beresolusi tinggi, stempel waktu, dan keterangan posko.

---

### 4. Perlindungan Keamanan, Privasi & Keterlacakan (Security, Privacy & Traceability)
- **Role-Based Access Control (RBAC)**: Pemisahan peran tegas antara Donatur Publik, Administrator, dan Mitra Lapangan yang ditegakkan di level database (*Firestore Security Rules*), bukan sekadar menyembunyikan tombol antarmuka.
- **Isolasi Privasi Donatur**: Linimasa bantuan bencana disajikan secara kolektif per bencana (`disasterTimeline`). Riwayat bantuan dapat dipantau oleh siapa saja, namun seluruh informasi sensitif donatur (nama lengkap jika anonim, email, dan nomor telepon) disaring secara ketat agar tidak bocor ke publik.
- **Keterlacakan Penuh (*End-to-End Traceability*)**: Setiap rupiah pencairan dana terikat pada daftar ID donasi asal (*sourceDonationIds*), ID permohonan pencairan (*disbursementId*), akun mitra penerima (*partnerId*), hingga laporan penyerahan barang di posko.

---

### 5. Evaluasi Hasil & Indikator Kuantitatif Keberhasilan (Evaluation Metrics)
Keberhasilan produk diukur melalui indikator teknis dan operasional yang dapat diverifikasi secara objektif pada sesi demonstrasi hackathon:

| Indikator Keberhasilan | Target Pengujian Demonstrasi | Bukti Verifikasi Sistem |
|---|---|---|
| **Efektivitas Karantina BMKG** | **100% Data Mentah Terkarantina** (0 kebocoran data draft ke publik sebelum persetujuan admin). | Query Firestore `where status == 'admin_approved'` di katalog donatur. |
| **Integritas Penugasan Mitra** | **0 Bencana Aktif Tanpa Mitra** (Tombol persetujuan terkunci jika mitra belum dipilih). | Validasi form disabled & skema payload backend. |
| **Ketepatan Transaksi QRIS** | **100% Invoice Berhasil di-Generate & Ter-render** dalam bentuk kode QR siap pindai. | Respons inquiry Duitku Direct API metode `SP`. |
| **Ketahanan Webhook Callback**| **100% Lolos Uji Idempotensi** (Callback duplikat diabaikan tanpa penambahan saldo ganda). | Log backend mencatat `Callback processed (Idempotent)`. |
| **Pencegahan Defisit Kas** | **100% Pencegahan Overdraw** (Permohonan pencairan melebihi sisa kas ditolak seketika). | Transaksi atomik `db.runTransaction()` melempar error saldo tidak cukup. |
| **Keterlacakan Milestone Posko**| **100% Tahap Penyaluran Berbukti Foto** dan tercatat di linimasa publik. | Entri subkoleksi `disasterTimeline` memuat tautan aman Cloudinary CDN. |
| **Responsivitas Perangkat** | **0 Layout Broken** pada layar ponsel 360px hingga monitor desktop 1080p+. | Pengujian responsivitas CSS Tailwind v4 lintas viewport. |

---

### 6. Pernyataan Kesiapan Demonstrasi (Demo Readiness Statement)
Aplikasi **Bersama Kita** berstatus **Siap Demonstrasi Langsung (*Demo Ready*)**. Seluruh alur utama—mulai dari penarikan data BMKG, persetujuan dan penugasan mitra oleh admin, pembayaran QRIS sandbox real-time, pencairan dana terkontrol, hingga pelaporan 6 milestone berfoto oleh mitra posko—telah terimplementasi secara fungsional dalam kode sumber dan siap diuji secara interaktif di hadapan Dewan Juri.
