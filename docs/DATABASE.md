# Database Schema (Firestore)

This schema reflects the actual Firestore structure based on `firestore.rules` and `src/types/index.ts`.

## 1. `users`
- **Fields**: `id`, `email`, `displayName`, `photoURL`, `phone`, `role` (`user`, `admin`, `partner`), `partnerId`, `createdAt`, `updatedAt`
- **Rules**: Users can read/write their own. Admins/Partners can read. Admins can update/delete.

## 2. `earthquakeEvents`
- **Fields**: `id`, `source`, `magnitude`, `depth`, `location`, `region`, `coordinates`, `eventTime`, `potensi`, `shakemap`, `fetchedAt`, `createdAt`
- **Rules**: Public read. **Write: admin only** (ingest via admin boot / `POST /api/bmkg/refresh` — Admin SDK; klien pengguna tidak lagi menulis langsung). *(Fase 5)*

## 3. `disasters`
- **Fields**: `id`, `earthquakeEventId`, `title`, `magnitude`, `depth`, `location`, `coordinates`, `eventTime`, `status` (`pending_verification`, `admin_approved`, `auto_approved`, `rejected`, `published`, `archived`), `verificationMethod`, `verifiedAt`, `publishedAt`, `notes`, `fundingTarget` (opsional, fallback Rp50jt), `partnerId`, `partnerName`, `archivedAt`, `createdAt`, `updatedAt`
- **Rules**: Read tergantung status (publik jika approved/published/archived, selain itu Admin/Partner). **Write: admin/partner** (alur approve+assign mitra di `BMKGVerificationCard` adalah admin). *(Fase 5)*

## 4. `donations`
- **Fields**: `id`, `userId`, `amount` (nominal donasi — WITHOUT admin fee), `donorName`, `donorEmail`, `donorPhone`, `isAnonymous`, `message`, `status` (`pending_payment`, `paid`, `failed`, `expired`, `refunded`), `paymentId`, `paymentMethod` (`qris`), `disasterId`, `disasterTitle`, `createdAt`, `updatedAt`
- **Rules**: Read utk pemilik, Admin, Partner. **Create/update utk pemilik (wajib login), Admin, atau Partner** — jalur guest dihapus (checkout donasi selalu login). *(Fase 5)*

## 5. `payments`
- **Fields**: `id`, `donationId`, `userId` (owner — required by the `firestore.rules` payments read rule), `provider`, `providerReference`, `paymentMethod` (`SP` = QRIS), `paymentChannel` (`QRIS`), `amount` (nominal donasi), `fee` (biaya administrasi 0,17%, terpisah dari nominal), `paidAmount` (total yang dibayar = amount + fee), `status` (`pending`, `processing`, `paid`, `failed`, `cancelled`, `expired`), `paymentUrl`, `qrString`, `vaNumber`, `createdAt`, `paidAt`, `updatedAt`
- **Rules**: Read utk pemilik, Admin, Partner. **Create utk pemilik (wajib login), Admin, Partner** — tidak lagi `if true`. Update utk pemilik, Admin, Partner. *(Fase 5)*

## 6. `disbursements`
- **Fields**: `id`, `amount` (nominal penarikan), `fee` (biaya administrasi penarikan 0,17%, optional — dokumen lama tanpa fee = 0), `totalAmount` (= amount + fee), `partnerId`, `partnerName`, `status`, `provider`, `requestedAt`, `processedAt`, `createdBy`
- **Rules**: Read for Admin/Partner. Write for Admin.
- **Note**: Minimal penarikan Rp1.000.000 (`MIN_WITHDRAWAL` di `src/lib/fees.ts`). Saldo keluar dihitung memakai `totalAmount` (nominal + fee).

## 7. `partners`
- **Fields**: `id`, `userId` (Firebase Auth UID), `name`, `email`, `organization`, `contact`, `operationalArea`, `logo` (image URL — legacy external or Cloudinary), `logoPublicId` (Cloudinary `public_id` of `logo`, empty for legacy URLs), `description`, `location`, `status`, `createdAt`, `updatedAt`
- **Rules**: Public read. **Write: admin only** (akun mitra dibuat via backend `/api/admin/create-partner` dengan Admin SDK; edit via `AdminPartnersView`). *(Fase 5)*

## 8. `partnerAllocations`
- **Fields**: `id`, `disbursementId`, `partnerId`, `partnerName`, `amount`, `sourceDonationIds`, `status`, `evidencePhotoUrl` (Cloudinary or legacy URL), `evidencePhotoPublicId`, `milestones[].photoUrl`, `milestones[].photoPublicId`, `allocatedAt`, `createdAt`, `updatedAt`
- **Rules**: Read utk pengguna login (bagian Transparansi). **Write: admin/partner** — alokasi KOLEKTIF per bencana dibuat server-side oleh `POST /api/fundraising/admin/disbursements` via Admin SDK; partner hanya update milestone/status. *(Fase 3 + Fase 5)*

## 9. `distributionReports`
- **Fields**: `id`, `partnerId`, `partnerName`, `allocationId`, `status`, `location`, `distributionDate`, `items`, `notes`, `photoUrls`, `photoPublicIds` (Cloudinary `public_id` aligned with `photoUrls`), `submittedAt`, `createdAt`, `updatedAt`
- **Rules**: Read publik jika submitted/published. **Write: admin/partner**. *(Fase 5)*

## 10. `trackingEvents`
- **Fields**: `id`, `donationId`, `type`, `title`, `description`, `timestamp`, `visibleToUser`, `createdBy`, `partnerId`, `location`, `photoUrl`, `photoPublicId`, `itemsDetail`
- **Rules**: Read for owner, Admin, Partner. Create/Update/Delete primarily Admin/Partner.

## 11. `auditLogs`
- **Fields**: `id`, `actorId`, `actorRole`, `action`, `entityType`, `entityId`, `timestamp`
- **Rules**: Read untuk Admin. **Write: admin/partner** (semua penulis klien audit = admin/partner). *(Fase 5)*

## 12. `disasterTimeline` *(baru — Fase 3, tracking KOLEKTIF)*
- **Path**: `disasterTimeline/{disasterId}/events/{eventId}`
- **Fields**: `id`, `disasterId`, `disasterTitle`, `type` (`disbursement_created`, `funds_disbursed`, `funds_received_by_partner`, `distribution_started`, `milestone_updated`, `report_submitted`, `report_published`, `fundraising_closed`, `partner_update`, `system`), `title`, `description`, `location`, `photoUrl`, `amount`, `actorRole` (`admin`|`partner`|`system`), `actorName`, `createdAt`
- **Tujuan**: SATU timeline penyaluran untuk SEMUA donatur bencana yang sama (tanpa PII donatur) — menggantikan fragmentasi tracking per-donasi.
- **Rules**: **Read publik**. Create/update: admin/partner. Delete: admin. Event otomatis ditulis saat pencairan (`disbursement_created`), konfirmasi dana mitra (`funds_received_by_partner`), update milestone (`milestone_updated`), dan penutupan penggalangan (`fundraising_closed`). *(Fase 3/4)*

## 13. `distributions` (legacy/alternatif)
- **Paths**: `distributions/{trackingId}`
- **Rules**: Read publik. Create/update oleh admin/partner atau pemilik `partnerId`. Delete admin. (Koleksi lama; alur utama kini via `partnerAllocations` + `disasterTimeline`.)
