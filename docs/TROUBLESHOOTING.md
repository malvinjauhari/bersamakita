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
