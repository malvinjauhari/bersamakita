# Troubleshooting & Error Logs

This document tracks significant bugs, structural errors, and critical lessons learned during the development of the Bersama Kita platform. 

Future developers and AI Agents **MUST** review this document when debugging or planning complex features to avoid repeating past mistakes.

---

## 1. Firebase Authentication & Firestore Rules

### 🔴 Error: `Missing or insufficient permissions` on Firestore Queries (Admin Dashboard)
- **Symptoms**: `getDisasters`, `getDistributionReports`, `getDisbursements` throw permission errors when the Admin navigates to the dashboard, despite being "logged in".
- **Root Cause**: The frontend `loginStaff` function was only saving `{ role: 'admin' }` to `localStorage` (mock session) without actually signing into Firebase Auth via `signInWithEmailAndPassword`. Because of this, the HTTP requests sent by the Firebase Client SDK to Firestore were **unauthenticated** (`request.auth == null`). The `firestore.rules` correctly blocked these requests.
- **Fix Applied**: 
  1. Updated `loginStaff` in `AuthContext.tsx` to strictly use `signInWithEmailAndPassword` even for the Master Admin.
  2. Added an auto-creation fallback (`createUserWithEmailAndPassword`) for the Master Admin if their account didn't exist yet in the Auth database.
  3. Added the Master Admin email to the `isAdmin()` function in `firestore.rules`.
- **Lesson Learned**: **Never use UI-only state (`localStorage`) to bypass authentication.** If Firestore Rules expect `request.auth`, the user MUST possess a valid Firebase Auth JWT token.

### 🔴 Error: Corrupted `firestore.rules` Syntax
- **Symptoms**: All database queries fail globally.
- **Root Cause**: Accidental duplication/overlap of rule blocks caused severe syntax errors (e.g., mismatched brackets and duplicated match statements).
- **Fix Applied**: Completely restored `firestore.rules` from `backup/rules2.md` and meticulously reapplied custom rules line-by-line.
- **Lesson Learned**: When modifying `firestore.rules`, avoid doing partial regex replacements. Ensure the brackets and logical conditions `||` / `&&` remain perfectly balanced.

---

## 2. Firebase Admin SDK (Node.js / Express Backend)

### 🔴 Error: `adminAuth is not defined`
- **Symptoms**: Creating a Partner account via `POST /api/admin/create-partner` crashes the Express server.
- **Root Cause**: While `adminDb` was imported into `server.ts`, the `adminAuth` instance was not exported from `firebase-admin.ts` or imported where it was being used.
- **Fix Applied**: Properly exported `export const adminAuth = getAuth();` alongside the database instance and updated the import statement in `server.ts`.
- **Lesson Learned**: Always explicitly check that the specific Firebase Admin module (Auth, Firestore, Storage) is initialized and imported before deploying new backend routes.

---

## 3. Business Logic Violations

### 🔴 Error: Pending BMKG Data Leaking to Public Users
- **Symptoms**: When the Firestore database was completely empty, newly fetched earthquake data from BMKG was automatically visible to public donors without Admin approval.
- **Root Cause**: The frontend (`App.tsx`) contained "fallback" logic that injected `status: 'published'` into live BMKG data just to avoid rendering an empty screen. Additionally, there was a background cron script that auto-approved data after 24 hours.
- **Fix Applied**: 
  1. Destroyed all auto-publish fallback logic. 
  2. Deleted the 24-hour cron endpoint. 
  3. Forced all incoming BMKG data to have `status: 'pending_verification'`. 
  4. Designed a proper "Empty State" UI for users (`Belum Ada Posko Bencana Terverifikasi`).
- **Lesson Learned**: **Never write code that sacrifices strict business rules for the sake of UI convenience.** Empty states are valid and required. All data must explicitly await manual human verification (`admin_approved`).

### 🔴 Error: User biasa kena `Missing or insufficient permissions` (write ke `disasters/...` + `getDisasters` baca gagal) pasca-hardening rules
- **Symptoms**: Akun Google biasa (mis. `alvinjauhari29@gmail.com`) mencetak di console (produksi): `getDisasters notice: FirebaseError: Missing or insufficient permissions`, `Firestore Error: {... "operationType":"write", "path":"disasters/disaster-auto-..."}`, dan `Initial BMKG pool check notice: Error: ...`.
- **Root Cause**: Setelah hardening `firestore.rules` (Fase 5) membatasi write `earthquakeEvents`/`disasters` ke admin/partner, **masih tersisa dua jalur ingest BMKG sisi klien**: (1) bootstrap "Initial BMKG pool check" di `loadData` (`App.tsx`) yang dipicu ketika `isAdminAuthenticated` benar (termasuk bila `staffSession` admin tersisa stale di localStorage) — jika akun yang sedang login adalah Google biasa, tokennya tidak admin → write ditolak; (2) `handleAdminRefreshBMKG` yang menulis via `saveBMKGDisaster`. Selain itu `getDisasters('all')` (query TANPA filter status) yang dipakai pool check **ditolak rules utk non-admin**: aturan read memanggil `isAdmin()` yang butuh `get()`, dan query tak-terkendali tidak bisa dibuktikan oleh rules engine → seluruh query di-deny tanpa per-doc filter.
- **Fix Applied**: Semua ingest BMKG kini melalui server — satu helper `refreshBMKGServer()` (`POST /api/bmkg/refresh`, verifyIdToken + Admin SDK, hasil SELALU `pending_verification`) dipakai oleh pool check, tombol "Refresh BMKG" user, dan admin refresh. Klien **tidak menulis** `earthquakeEvents`/`disasters` di jalur mana pun. **Lapisan kedua (akar masalah)**: `AuthContext` merekonciliasi `staffSession` (localStorage) dengan Firebase user aktif — saat email session ≠ email token, session staff **dibersihkan otomatis** (mencegah mismatch "flag admin stale + token Google biasa"). `loadData` juga diberi fallback `getDisasters('published')` bila query admin `'all'` gagal (agar daftar user tidak kosong). Diklarifikasi via REST: query `status == 'admin_approved'` diizinkan utk user biasa, tetapi query `'all'`/`status IN [...]` yang mencakup `pending_verification` **403** — mode `'all'` hanya bisa dibaca token admin. QA `scripts/qa-phase6.ts` menambah bukti user biasa BISA query baca `admin_approved` (HTTP 200) dan tetap DITOLAK write (403).
- **Lesson Learned**: Hardening rules bukan hanya mengunci rule Firestore — **audit semua pemanggil client-side yang tersisa** (terutama jalur "auto/bootstrap" yang berjalan untuk rol apapun). Jangan pernah menganggap `isAdminAuthenticated` frontend (bisa berasal dari `staffSession` stale) samadengan token Firebase yang benar-benar admin. Standar: **write kolektif/operasional → endpoint Express via Admin SDK; klien hanya baca**.
- **Referensi**: `GET /api/bmkg/refresh` di `server/routes/bmkg.ts`; helper `refreshBMKGServer()` di `src/App.tsx`; test di `scripts/qa-phase6.ts`.

### 🔴 Error: `Access to storage is not allowed from this context.` (Uncaught (in promise) di dashboard)
- **Symptoms**: Error runtime di console saat halaman dashboard dimuat, padahal aplikasi tidak meng-upload apa pun ke Firebase Storage.
- **Root Cause**: `src/config/firebase.ts` mengeksekusi `getStorage(app)` **saat import modul**. Di konteks tanpa `indexedDB`/storage-partitioned (mis. iframe sandbox, panel preview, ekstensi) Firebase Storage melempar error ini saat inisialisasi. Modul mana pun tidak mengimpor `storage` (export mati) — semua upload bukti penyaluran sudah via Cloudinary/server.
- **Fix Applied**: Hapus `getStorage`/`export const storage` dari `firebase.ts`. Bila kelak benar-benar butuh Storage, inisialisasi LAZY tepat di modul pemakainya.
- **Lesson Learned**: Jangan inisialisasi SDK pada module-eval jika belum dipakai — inisialisasi lazy hanya di tempat penggunaan. Export yang tidak pernah diimpor tetap bisa menimbulkan error runtime saat import.

> ⚠️ **Catatan QA Firestore REST**: Untuk query via REST gunakan URL `.../documents:runQuery` dengan koleksi di body `structuredQuery.from` — bentuk `.../documents/disasters:runQuery` di-resolve server sebagai `createDocument` (HTTP 400 `Unknown name "structuredQuery" at 'document'`). Browser SDK tidak terpengaruh (memakai API internal berbeda), hanya pola test/curl.
