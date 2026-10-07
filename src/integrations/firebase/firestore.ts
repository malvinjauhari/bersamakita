import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import {
  Disaster,
  DisasterStatus,
  Donation,
  DonationStatus,
  PaymentRecord,
  PaymentStatus,
  Disbursement,
  Partner,
  PartnerAllocation,
  DistributionReport,
  TrackingEvent,
  TrackingEventType,
  AuditLog,
  EarthquakeEvent,
  DistributionMilestoneKey,
  DistributionMilestone,
} from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

/**
 * Recursively removes all undefined fields from an object
 * to prevent Firestore SDK "Function setDoc() called with invalid data. Unsupported field value: undefined" errors.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

// Auto-approve logic has been removed due to business rules requiring manual admin verification with partner assignment.

export async function getDisasters(
  filter: 'all' | 'published' | 'pending' = 'published'
): Promise<Disaster[]> {
  const collRef = collection(db, 'disasters');
  try {
    let q;
    const effectiveFilter = !auth.currentUser && filter === 'all' ? 'published' : filter;
    if (effectiveFilter === 'published') {
      q = query(
        collRef,
        where('status', '==', 'admin_approved'),
        limit(50)
      );
    } else if (effectiveFilter === 'pending') {
      q = query(collRef, where('status', '==', 'pending_verification'), limit(50));
    } else {
      q = query(collRef, limit(60));
    }

    const snap = await getDocs(q);
    const results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Disaster));
    return results.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  } catch (error) {
    console.warn('getDisasters notice:', error);
    return [];
  }
}

export async function saveBMKGDisaster(
  event: EarthquakeEvent,
  disaster: Disaster
): Promise<void> {
  // Do not attempt unauthenticated writes to Firestore
  if (!auth.currentUser) {
    return;
  }
  try {
    await setDoc(doc(db, 'earthquakeEvents', event.id), sanitizeForFirestore(event), { merge: true });
    await setDoc(doc(db, 'disasters', disaster.id), sanitizeForFirestore(disaster), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `disasters/${disaster.id}`);
  }
}

export async function updateDisasterStatus(
  disasterId: string,
  status: DisasterStatus,
  verificationMethod: 'manual' | 'rule_based_auto',
  notes?: string,
  partnerId?: string,
  partnerName?: string
): Promise<void> {
  const dRef = doc(db, 'disasters', disasterId);
  try {
    // Validate business rule: Approval requires a partner
    if (status === 'admin_approved' && (!partnerId || !partnerName)) {
      throw new Error('Approval requires a designated Partner/Mitra Lapangan');
    }

    const updateData: Partial<Disaster> = {
      status,
      verificationMethod,
      verifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(notes ? { notes } : {}),
      ...(partnerId ? { partnerId, partnerName } : {}),
      ...(status === 'published' ||
      status === 'admin_approved' ||
      status === 'auto_approved'
        ? { publishedAt: new Date().toISOString() }
        : {}),
    };
    await updateDoc(dRef, updateData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `disasters/${disasterId}`);
  }
}

// ---------------------------------------------------------------------------
// Donations (Pure Firestore - Strict Isolation per User)
// ---------------------------------------------------------------------------

export async function createDonation(donation: Donation): Promise<void> {
  try {
    const cleaned = sanitizeForFirestore(donation);
    await setDoc(doc(db, 'donations', donation.id), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `donations/${donation.id}`);
  }
}

export async function updateDonationStatus(
  donationId: string,
  status: DonationStatus,
  paymentId?: string
): Promise<void> {
  try {
    const dRef = doc(db, 'donations', donationId);
    await updateDoc(dRef, sanitizeForFirestore({
      status,
      ...(paymentId ? { paymentId } : {}),
      updatedAt: new Date().toISOString(),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `donations/${donationId}`);
  }
}

export async function getDonation(donationId: string): Promise<Donation | null> {
  try {
    const snap = await getDoc(doc(db, 'donations', donationId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Donation;
    }
  } catch (error) {
    console.warn(`getDonation ${donationId} notice:`, error);
  }
  return null;
}

export async function getUserDonations(
  userId?: string,
  userEmail?: string
): Promise<Donation[]> {
  // If not authenticated, return empty array immediately.
  // Never expose donations across different users.
  if (!userId && !userEmail) {
    return [];
  }

  const cleanEmail = userEmail?.trim().toLowerCase();

  // 1. Query Firestore for this specific userId
  if (userId) {
    try {
      const collRef = collection(db, 'donations');
      const q = query(collRef, where('userId', '==', userId));
      const snap = await getDocs(q);
      const results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Donation));
      if (results.length > 0) {
        return results.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    } catch (error) {
      console.warn('getUserDonations by userId notice:', error);
    }
  }

  // 2. Query Firestore by donorEmail if userId returned empty
  if (cleanEmail) {
    try {
      const collRef = collection(db, 'donations');
      const q = query(collRef, where('donorEmail', '==', cleanEmail));
      const snap = await getDocs(q);
      const results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Donation));
      if (results.length > 0) {
        return results.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    } catch (error) {
      console.warn('getUserDonations by email notice:', error);
    }
  }

  return [];
}

export async function getAllDonations(): Promise<Donation[]> {
  try {
    const collRef = collection(db, 'donations');
    const q = query(collRef, limit(100));
    const snap = await getDocs(q);
    const results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Donation));
    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error: any) {
    if (error?.code !== 'permission-denied') {
      console.warn('getAllDonations notice:', error);
    }
    return [];
  }
}

// ---------------------------------------------------------------------------
// Payments (Pure Firestore)
// ---------------------------------------------------------------------------

export async function savePaymentRecord(payment: PaymentRecord): Promise<void> {
  try {
    await setDoc(doc(db, 'payments', payment.id), sanitizeForFirestore(payment));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `payments/${payment.id}`);
  }
}

export async function updatePaymentRecord(
  paymentId: string,
  status: PaymentStatus,
  paidAmount?: number
): Promise<void> {
  try {
    const pRef = doc(db, 'payments', paymentId);
    await updateDoc(pRef, sanitizeForFirestore({
      status,
      ...(paidAmount !== undefined ? { paidAmount } : {}),
      ...(status === 'paid' ? { paidAt: new Date().toISOString() } : {}),
      updatedAt: new Date().toISOString(),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `payments/${paymentId}`);
  }
}

export async function getPayment(paymentId: string): Promise<PaymentRecord | null> {
  try {
    const snap = await getDoc(doc(db, 'payments', paymentId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as PaymentRecord;
    }
  } catch (error) {
    console.warn(`getPayment ${paymentId} notice:`, error);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Disbursements (Pure Firestore - Admin Only)
// ---------------------------------------------------------------------------

export async function createDisbursement(disbursement: Disbursement): Promise<void> {
  try {
    await setDoc(doc(db, 'disbursements', disbursement.id), disbursement);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `disbursements/${disbursement.id}`);
  }
}

export async function getDisbursements(): Promise<Disbursement[]> {
  try {
    const collRef = collection(db, 'disbursements');
    const snap = await getDocs(collRef);
    const results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Disbursement));
    return results.sort(
      (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );
  } catch (error: any) {
    if (error?.code !== 'permission-denied') {
      console.warn('getDisbursements notice:', error);
    }
    return [];
  }
}

export async function updateDisbursementStatus(
  disbursementId: string,
  status: Disbursement['status']
): Promise<void> {
  try {
    const dRef = doc(db, 'disbursements', disbursementId);
    await updateDoc(dRef, {
      status,
      completedAt: status === 'success' ? new Date().toISOString() : undefined,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `disbursements/${disbursementId}`);
  }
}

// ---------------------------------------------------------------------------
// Partners (Pure Firestore)
// ---------------------------------------------------------------------------

export async function getPartners(): Promise<Partner[]> {
  try {
    const collRef = collection(db, 'partners');
    const snap = await getDocs(collRef);
    const results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Partner));
    return results;
  } catch (error) {
    console.warn('getPartners notice:', error);
    return [];
  }
}

export async function createPartner(partner: Partner): Promise<void> {
  try {
    await setDoc(doc(db, 'partners', partner.id), partner, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `partners/${partner.id}`);
  }
}

export const savePartner = createPartner;

export async function updatePartner(partner: Partner): Promise<void> {
  try {
    await setDoc(doc(db, 'partners', partner.id), partner, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `partners/${partner.id}`);
  }
}

// ---------------------------------------------------------------------------
// Partner Allocations (Pure Firestore)
// ---------------------------------------------------------------------------

export async function createPartnerAllocation(
  allocation: PartnerAllocation
): Promise<void> {
  try {
    await setDoc(doc(db, 'partnerAllocations', allocation.id), allocation);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `partnerAllocations/${allocation.id}`);
  }
}

export async function getPartnerAllocations(
  partnerId?: string
): Promise<PartnerAllocation[]> {
  try {
    const collRef = collection(db, 'partnerAllocations');
    const q = partnerId ? query(collRef, where('partnerId', '==', partnerId)) : collRef;
    const snap = await getDocs(q);
    const results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PartnerAllocation));
    return results.sort(
      (a, b) => new Date(b.allocatedAt).getTime() - new Date(a.allocatedAt).getTime()
    );
  } catch (error: any) {
    if (error?.code !== 'permission-denied') {
      console.warn('getPartnerAllocations notice:', error);
    }
    return [];
  }
}

export async function confirmAllocationReceipt(allocationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'partnerAllocations', allocationId), {
      status: 'funds_received',
      receivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `partnerAllocations/${allocationId}`);
  }
}

export async function updateAllocationStatus(
  allocationId: string,
  status: PartnerAllocation['status']
): Promise<void> {
  try {
    await updateDoc(doc(db, 'partnerAllocations', allocationId), {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `partnerAllocations/${allocationId}`);
  }
}

export async function updateAllocationMilestone(
  allocationId: string,
  milestoneKey: DistributionMilestoneKey,
  data: {
    detail?: string;
    location?: string;
    photoUrl?: string;
    actorEmail?: string;
    actorName?: string;
  }
): Promise<PartnerAllocation | null> {
  const now = new Date().toISOString();

  try {
    const allocRef = doc(db, 'partnerAllocations', allocationId);
    const snap = await getDoc(allocRef);

    if (!snap.exists()) {
      return null;
    }

    const current = { id: snap.id, ...snap.data() } as PartnerAllocation;
    const newStatus: PartnerAllocation['status'] =
      milestoneKey === 'completed'
        ? 'completed'
        : milestoneKey === 'funds_received'
        ? 'funds_received'
        : 'in_distribution';

    const milestoneTitles: Record<DistributionMilestoneKey, string> = {
      allocated: 'Dana Dialokasikan ke Mitra',
      funds_received: 'Dana Masuk Kas Posko',
      goods_packed: 'Bantuan Sudah Dikemas',
      in_transit: 'Bantuan Sudah Tiba di Wilayah Bencana',
      arrived_at_posko: 'Bantuan Sudah Tiba di Posko Lapangan',
      handed_over: 'Bantuan Sudah Diserahkan ke Posko / Warga',
      completed: 'Penyaluran Selesai (Tuntas 100%)',
    };

    const newMilestone: DistributionMilestone = {
      key: milestoneKey,
      title: milestoneTitles[milestoneKey],
      detail: data.detail || current.packedItemsSummary,
      location: data.location || current.targetLocation,
      photoUrl: data.photoUrl || current.evidencePhotoUrl,
      completedAt: now,
      isCurrent: true,
    };

    const updatedMilestones: DistributionMilestone[] = (current.milestones || []).map(
      (m) => ({ ...m, isCurrent: false })
    );

    const existingIdx = updatedMilestones.findIndex((m) => m.key === milestoneKey);
    if (existingIdx >= 0) {
      updatedMilestones[existingIdx] = newMilestone;
    } else {
      updatedMilestones.push(newMilestone);
    }

    const updatedAllocation: PartnerAllocation = {
      ...current,
      status: newStatus,
      currentMilestone: milestoneKey,
      milestones: updatedMilestones,
      targetLocation: data.location || current.targetLocation,
      packedItemsSummary: data.detail || current.packedItemsSummary,
      evidencePhotoUrl: data.photoUrl || current.evidencePhotoUrl,
      receivedAt: milestoneKey === 'funds_received' ? now : current.receivedAt,
      updatedAt: now,
    };

    await setDoc(allocRef, updatedAllocation, { merge: true });

    // Synchronize tracking event for each source donation with strict userId association
    if (updatedAllocation.sourceDonationIds) {
      const descriptions: Record<DistributionMilestoneKey, string> = {
        allocated: `Dana donasi dialokasikan kepada mitra ${updatedAllocation.partnerName}.`,
        funds_received: `Dana bantuan telah masuk ke rekening kas posko mitra ${updatedAllocation.partnerName} dan siap dibelanjakan untuk pengadaan logistik.`,
        goods_packed: data.detail
          ? `Sudah dikemas, berupa: ${data.detail}.`
          : 'Sudah dikemas, berupa 150 paket sembako, beras 5kg, selimut hangat & hygiene kit.',
        in_transit: data.location
          ? `Sudah tiba di ${data.location}.`
          : 'Armada logistik telah berangkat dan tiba di wilayah kabupaten/kota bencana.',
        arrived_at_posko: data.location
          ? `Sudah tiba di posko ${data.location}.`
          : 'Bantuan logistik telah tiba dengan selamat di posko lapangan untuk verifikasi.',
        handed_over: data.detail
          ? `Sudah diserahkan ke ${data.location || 'posko'}: ${data.detail}.`
          : 'Sudah diserahkan ke posko pengungsian dan diterima langsung oleh warga terdampak bencana.',
        completed:
          'Seluruh bantuan telah tuntas disalurkan 100% dan berita acara serah terima resmi telah disahkan oleh tim verifikator.',
      };

      for (const donId of updatedAllocation.sourceDonationIds) {
        // Look up donation to attach owner userId for database-level user isolation
        let donorUserId = 'system';
        try {
          const donSnap = await getDoc(doc(db, 'donations', donId));
          if (donSnap.exists()) {
            donorUserId = (donSnap.data() as Donation).userId;
          }
        } catch {}

        await addTrackingEvent({
          id: `trk-${milestoneKey}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          donationId: donId,
          userId: donorUserId,
          type: milestoneKey as TrackingEventType,
          title: milestoneTitles[milestoneKey],
          description: descriptions[milestoneKey],
          timestamp: now,
          visibleToUser: true,
          createdBy: data.actorEmail || 'partner',
          partnerId: updatedAllocation.partnerId,
          location: data.location || updatedAllocation.targetLocation,
          photoUrl: data.photoUrl || updatedAllocation.evidencePhotoUrl,
          itemsDetail: data.detail || updatedAllocation.packedItemsSummary,
          milestoneKey,
        });
      }

      // Save or update corresponding DistributionReport in Firestore
      const reportId = `rep-${allocationId}`;
      const reportData: DistributionReport = {
        id: reportId,
        partnerId: updatedAllocation.partnerId,
        partnerName: updatedAllocation.partnerName,
        allocationId: updatedAllocation.id,
        disbursementId: updatedAllocation.disbursementId,
        status: milestoneKey === 'completed' ? 'published' : 'submitted',
        location: data.location || updatedAllocation.targetLocation || 'Posko Bencana Lapangan',
        distributionDate: now.split('T')[0],
        items:
          data.detail || updatedAllocation.packedItemsSummary
            ? [
                {
                  name: data.detail || updatedAllocation.packedItemsSummary || 'Paket Logistik Bencana',
                  quantity: 1,
                  unit: 'paket',
                },
              ]
            : [{ name: 'Paket Logistik Tanggap Darurat', quantity: 100, unit: 'paket' }],
        notes: `${milestoneTitles[milestoneKey]}: ${
          data.detail ? `Berupa ${data.detail}. ` : ''
        }${data.location ? `Lokasi: ${data.location}.` : ''}`,
        photoUrls:
          data.photoUrl || updatedAllocation.evidencePhotoUrl
            ? [data.photoUrl || updatedAllocation.evidencePhotoUrl!]
            : [],
        submittedAt: now,
        updatedAt: now,
        createdAt: now,
      };

      await saveDistributionReport(reportData);
    }

    return updatedAllocation;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `partnerAllocations/${allocationId}`);
    return null;
  }
}

export async function ensureAllocationForDonation(
  donation: Donation
): Promise<PartnerAllocation> {
  const existingAllocs = await getPartnerAllocations();
  const found = existingAllocs.find((a) => a.sourceDonationIds?.includes(donation.id));
  if (found) return found;

  const now = new Date().toISOString();
  const newAlloc: PartnerAllocation = {
    id: `alloc-${donation.id}`,
    disbursementId: `disb-${donation.id}`,
    partnerId: 'partner-pmi',
    partnerName: 'Palang Merah Indonesia (PMI Lapangan)',
    amount: donation.amount,
    sourceDonationIds: [donation.id],
    status: 'funds_received',
    currentMilestone: 'funds_received',
    targetLocation: donation.disasterTitle
      ? `Posko Wilayah ${donation.disasterTitle}`
      : 'Posko Bencana Lapangan',
    packedItemsSummary: '150 Paket Sembako, Beras 5kg, Air Bersih & Selimut Hangat',
    evidencePhotoUrl:
      'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80',
    milestones: [
      {
        key: 'funds_received',
        title: 'Dana Masuk Kas Posko',
        detail: `Alokasi dana sebesar ${donation.amount} telah masuk ke kas posko mitra untuk penanganan bantuan`,
        location: donation.disasterTitle
          ? `Posko ${donation.disasterTitle}`
          : 'Posko Lapangan Wilayah Bencana',
        completedAt: now,
        isCurrent: true,
      },
    ],
    allocatedAt: now,
    receivedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await createPartnerAllocation(newAlloc);
  return newAlloc;
}

// ---------------------------------------------------------------------------
// Distribution Reports (Pure Firestore)
// ---------------------------------------------------------------------------

export async function getDistributionReports(
  partnerId?: string
): Promise<DistributionReport[]> {
  try {
    const collRef = collection(db, 'distributionReports');
    const q = partnerId ? query(collRef, where('partnerId', '==', partnerId)) : collRef;
    const snap = await getDocs(q);
    const results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DistributionReport));
    return results.sort((a, b) => {
      const timeA = new Date(a.submittedAt || a.createdAt).getTime();
      const timeB = new Date(b.submittedAt || b.createdAt).getTime();
      return timeB - timeA;
    });
  } catch (error: any) {
    if (error?.code !== 'permission-denied') {
      console.warn('getDistributionReports notice:', error);
    }
    return [];
  }
}

export async function saveDistributionReport(
  report: DistributionReport
): Promise<void> {
  try {
    await setDoc(doc(db, 'distributionReports', report.id), sanitizeForFirestore(report), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `distributionReports/${report.id}`);
  }
}

// ---------------------------------------------------------------------------
// Tracking Events (Pure Firestore - Isolated per User & Donation)
// ---------------------------------------------------------------------------

export async function getTrackingEventsForDonation(
  donationId: string,
  userId?: string
): Promise<TrackingEvent[]> {
  try {
    const collRef = collection(db, 'trackingEvents');
    let q = query(collRef, where('donationId', '==', donationId));
    if (userId) {
      q = query(collRef, where('donationId', '==', donationId), where('userId', '==', userId));
    }
    const snap = await getDocs(q);
    const results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TrackingEvent));
    return results.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  } catch (error) {
    console.warn(`getTrackingEvents for donation ${donationId} notice:`, error);
    return [];
  }
}

export async function addTrackingEvent(event: TrackingEvent): Promise<void> {
  try {
    await setDoc(doc(db, 'trackingEvents', event.id), sanitizeForFirestore(event));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `trackingEvents/${event.id}`);
  }
}

// ---------------------------------------------------------------------------
// Audit Logs (Pure Firestore - Admin Only)
// ---------------------------------------------------------------------------

export async function addAuditLog(log: AuditLog): Promise<void> {
  try {
    await setDoc(doc(db, 'auditLogs', log.id), sanitizeForFirestore(log));
  } catch (error) {
    console.warn('Audit log write notice:', error);
  }
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  try {
    const collRef = collection(db, 'auditLogs');
    const snap = await getDocs(collRef);
    const results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog));
    return results
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);
  } catch (error: any) {
    if (error?.code !== 'permission-denied') {
      console.warn('getAuditLogs notice:', error);
    }
    return [];
  }
}

// ---------------------------------------------------------------------------
// Failed Transaction History Cleanup (Admin Only)
// ---------------------------------------------------------------------------

export async function deleteFailedTransactions(): Promise<number> {
  const failedDonationsSnap = await getDocs(
    query(collection(db, 'donations'), where('status', '==', 'failed'))
  );
  const failedPaymentsSnap = await getDocs(
    query(collection(db, 'payments'), where('status', '==', 'failed'))
  );

  if (failedDonationsSnap.empty && failedPaymentsSnap.empty) {
    return 0;
  }

  const failedDonationIds = failedDonationsSnap.docs.map((d) => d.id);
  let deletedCount = 0;

  let batch = writeBatch(db);
  let ops = 0;

  const flush = async () => {
    if (ops > 0) {
      await batch.commit();
      batch = writeBatch(db);
      ops = 0;
    }
  };

  for (const snap of [failedDonationsSnap, failedPaymentsSnap]) {
    for (const d of snap.docs) {
      batch.delete(d.ref);
      ops++;
      deletedCount++;
      if (ops === 500) {
        await flush();
      }
    }
  }

  // Remove any tracking events still referencing the failed donations
  for (const donationId of failedDonationIds) {
    const eventsSnap = await getDocs(
      query(collection(db, 'trackingEvents'), where('donationId', '==', donationId))
    );
    for (const d of eventsSnap.docs) {
      batch.delete(d.ref);
      ops++;
      deletedCount++;
      if (ops === 500) {
        await flush();
      }
    }
  }

  await flush();

  const actor = auth.currentUser;
  await addAuditLog({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    actorId: actor?.uid || 'unknown',
    actorRole: 'admin',
    actorEmail: actor?.email || undefined,
    action: 'delete_failed_transactions',
    entityType: 'donations',
    entityId: `failed_batch_${Date.now()}`,
    after: { deletedCount, failedDonationCount: failedDonationIds.length },
    timestamp: new Date().toISOString(),
  });

  return deletedCount;
}
