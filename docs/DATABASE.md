# Database Schema (Firestore)

This schema reflects the actual Firestore structure based on `firestore.rules` and `src/types/index.ts`.

## 1. `users`
- **Fields**: `id`, `email`, `displayName`, `photoURL`, `phone`, `role` (`user`, `admin`, `partner`), `partnerId`, `createdAt`, `updatedAt`
- **Rules**: Users can read/write their own. Admins/Partners can read. Admins can update/delete.

## 2. `earthquakeEvents`
- **Fields**: `id`, `source`, `magnitude`, `depth`, `location`, `region`, `coordinates`, `eventTime`, `potensi`, `shakemap`, `fetchedAt`, `createdAt`
- **Rules**: Public read. Authenticated write.

## 3. `disasters`
- **Fields**: `id`, `earthquakeEventId`, `title`, `magnitude`, `depth`, `location`, `coordinates`, `eventTime`, `status` (`pending_verification`, `admin_approved`, `auto_approved`, `rejected`, `published`, `archived`), `verificationMethod`, `verifiedAt`, `publishedAt`, `notes`, `createdAt`, `updatedAt`
- **Rules**: Read depends on status (public if approved/published, otherwise Admin/Partner). Authenticated write.

## 4. `donations`
- **Fields**: `id`, `userId`, `amount`, `donorName`, `donorEmail`, `donorPhone`, `isAnonymous`, `message`, `status` (`pending_payment`, `paid`, `failed`, `expired`, `refunded`), `paymentId`, `paymentMethod`, `disasterId`, `disasterTitle`, `createdAt`, `updatedAt`
- **Rules**: Read for owner, Admin, Partner. Create for anyone/authenticated owner. Update for owner, Admin, Partner.

## 5. `payments`
- **Fields**: `id`, `donationId`, `provider`, `providerReference`, `paymentMethod`, `paymentChannel`, `amount`, `fee`, `paidAmount`, `status` (`pending`, `processing`, `paid`, `failed`, `cancelled`, `expired`), `paymentUrl`, `createdAt`, `updatedAt`
- **Rules**: Read for owner, Admin, Partner. Create public. Update for owner, Admin, Partner.

## 6. `disbursements`
- **Fields**: `id`, `amount`, `partnerId`, `partnerName`, `status`, `provider`, `requestedAt`, `processedAt`, `createdBy`
- **Rules**: Read for Admin/Partner. Write for Admin.

## 7. `partners`
- **Fields**: `id`, `userId` (Firebase Auth UID), `name`, `email`, `organization`, `contact`, `operationalArea`, `status`, `createdAt`, `updatedAt`
- **Rules**: Public read. Admin authenticated write only. Created strictly via backend endpoint.

## 8. `partnerAllocations`
- **Fields**: `id`, `disbursementId`, `partnerId`, `partnerName`, `amount`, `sourceDonationIds`, `status`, `allocatedAt`, `createdAt`, `updatedAt`
- **Rules**: Authenticated read/write.

## 9. `distributionReports`
- **Fields**: `id`, `partnerId`, `partnerName`, `allocationId`, `status`, `location`, `distributionDate`, `items`, `notes`, `photoUrls`, `submittedAt`, `createdAt`, `updatedAt`
- **Rules**: Read public if submitted/published. Authenticated write.

## 10. `trackingEvents`
- **Fields**: `id`, `donationId`, `type`, `title`, `description`, `timestamp`, `visibleToUser`, `createdBy`, `partnerId`, `location`, `photoUrl`, `itemsDetail`
- **Rules**: Read for owner, Admin, Partner. Create/Update/Delete primarily Admin/Partner.

## 11. `auditLogs`
- **Fields**: `id`, `actorId`, `actorRole`, `action`, `entityType`, `entityId`, `timestamp`
- **Rules**: Read for Admin. Write for Authenticated.
