import { Router } from 'express';
import { adminDb, adminAuth } from '../../src/config/firebase-admin.js';
import {
  ADMIN_FEE_RATE,
  MIN_WITHDRAWAL,
  calculateAdminFee,
  maxWithdrawableAmount,
} from '../../src/lib/fees.js';
import { FUNDRAISING_TARGET } from '../../src/lib/utils.js';

const router = Router();

/**
 * Total kas keluar untuk satu penarikan = nominal + biaya admin
 * (dokumen lama tanpa `totalAmount`/`fee` dianggap nominal saja).
 * Semantik identik dengan `disbursementOutflow()` di DisbursementManager.
 */
const disbursementOutflow = (d: any): number =>
  Number(d?.totalAmount ?? (Number(d?.amount || 0) + Number(d?.fee || 0)));

/**
 * Komisi admin per transaksi — dibaca dari payment.fee (sumber aktual),
 * fallback ke hitungan 0,17% untuk record legacy tanpa fee.
 */
const transactionAdminFee = (payment: any, amount: number): number => {
  if (!payment) return 0;
  if (Number(payment.fee)) return Number(payment.fee);
  return Math.round(Number(amount || 0) * ADMIN_FEE_RATE);
};

/**
 * GET /api/fundraising/summary
 *
 * SUMBER KEBENARAN progres donasi KOLEKTIF per bencana.
 * Seluruh angka diagregasi server-side dari data nyata (Admin SDK):
 *   - donations + payments berstatus `paid` (join by donationId)
 *   - disbursements (semua status)
 *   - disasters (metadata: title, status, fundingTarget, partner)
 *
 * Semantik finansial disamakan dengan DisbursementManager:
 *   disbursed = outflow disb. berstatus `success`
 *   inflight  = outflow disb. berstatus `submitted`/`processing`
 *   remaining = max(0, collected - disbursed - inflight)
 *
 * Karena bersumber dari record yang dibatasi `status === 'paid'` dan semua
 * jalur konfirmasi Duitku sudah idempotent, agregasi ini tidak mungkin
 * dihitung ganda oleh callback duplikat.
 */
router.get('/summary', async (_req, res) => {
  try {
    if (!adminDb) {
      return res.status(500).json({ success: false, message: 'Firebase Admin not initialized.' });
    }

    const [donationsSnap, paymentsSnap, disbursementsSnap, disastersSnap] = await Promise.all([
      adminDb.collection('donations').where('status', '==', 'paid').get(),
      adminDb.collection('payments').where('status', '==', 'paid').get(),
      adminDb.collection('disbursements').get(),
      adminDb.collection('disasters').get(),
    ]);

    // Join payments → donations by donationId (pola sama dengan transparency.ts)
    const paymentByDonationId = new Map<string, any>();
    const paymentByDocId = new Map<string, any>();
    for (const doc of paymentsSnap.docs) {
      const data = doc.data();
      paymentByDocId.set(doc.id, data);
      if (data.donationId) paymentByDonationId.set(data.donationId, data);
    }

    // Metadata disaster (title, status, fundingTarget, partner)
    const disasterMeta = new Map<string, any>();
    for (const doc of disastersSnap.docs) disasterMeta.set(doc.id, doc.data());

    const rows = new Map<string, any>();
    const getRow = (disasterId: string, disasterTitle: string) => {
      if (!rows.has(disasterId)) {
        const isBucket = disasterId.startsWith('__');
        const meta = isBucket ? null : disasterMeta.get(disasterId);
        rows.set(disasterId, {
          disasterId,
          disasterTitle: meta?.title || disasterTitle,
          status: isBucket ? 'legacy' : meta?.status || 'unknown',
          fundingTarget: Number(meta?.fundingTarget) || FUNDRAISING_TARGET,
          partnerId: meta?.partnerId || null,
          partnerName: meta?.partnerName || null,
          collected: 0,
          adminFeeTotal: 0,
          donationCount: 0,
          disbursed: 0,
          inflight: 0,
          remaining: 0,
        });
      }
      return rows.get(disasterId);
    };

    // 1. Agregasi donasi PAID per bencana
    for (const doc of donationsSnap.docs) {
      const don = doc.data();
      const amount = Number(don.amount || 0);
      const key = don.disasterId || '__none__';
      const row = getRow(key, don.disasterTitle || 'Donasi Umum');
      const payment =
        paymentByDonationId.get(don.id || doc.id) ||
        (don.paymentId ? paymentByDocId.get(don.paymentId) : null) ||
        null;
      row.collected += amount;
      row.adminFeeTotal += transactionAdminFee(payment, amount);
      row.donationCount += 1;
    }

    // 2. Agregasi pencairan per bencana (semantik DisbursementManager)
    for (const doc of disbursementsSnap.docs) {
      const disb = doc.data();
      const key = disb.disasterId || '__legacy__';
      const row = getRow(key, disb.disasterTitle || 'Pencairan Lama (Tanpa Bencana)');
      const outflow = disbursementOutflow(disb);
      if (disb.status === 'success') row.disbursed += outflow;
      else if (disb.status === 'submitted' || disb.status === 'processing') row.inflight += outflow;
    }

    for (const row of rows.values()) {
      row.remaining = Math.max(0, row.collected - row.disbursed - row.inflight);
    }

    const disasters = Array.from(rows.values()).sort((a, b) => b.collected - a.collected);

    // 3. Total global (remaining dihitung global, bukan penjumlahan per-bencana,
    //    agar bucket legacy/uncategorized tidak mengubah total kas tersedia)
    const totals = disasters.reduce(
      (acc, r) => ({
        collected: acc.collected + r.collected,
        adminFeeTotal: acc.adminFeeTotal + r.adminFeeTotal,
        donationCount: acc.donationCount + r.donationCount,
        disbursed: acc.disbursed + r.disbursed,
        inflight: acc.inflight + r.inflight,
      }),
      { collected: 0, adminFeeTotal: 0, donationCount: 0, disbursed: 0, inflight: 0 }
    );
    totals.remaining = Math.max(0, totals.collected - totals.disbursed - totals.inflight);

    return res.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        adminFeeRate: ADMIN_FEE_RATE,
        totals,
        disasters,
      },
    });
  } catch (error: any) {
    console.error('Fundraising summary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/fundraising/admin/disbursements
// Membuat PENCARIAN (disbursement + allocation + audit + timeline) secara
// ATOMIK dengan validasi saldo SERVER-SIDE. Sumber angka = data nyata
// (Admin SDK), bukan input client — client tidak bisa mengada-ada saldo.
// Auth: Bearer <Firebase ID Token> + verifikasi role admin.
// ---------------------------------------------------------------------------
router.post('/admin/disbursements', async (req, res) => {
  try {
    if (!adminDb || !adminAuth) {
      return res.status(500).json({ success: false, message: 'Firebase Admin not initialized.' });
    }
    // Local aliases — menjaga TS narrowing `adminDb`/`adminAuth` di dalam closure
    // (Promise.all / runTransaction) setelah guard selesai.
    const db = adminDb;
    const fbAuth = adminAuth;

    // 1. Auth admin
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(403).json({ success: false, message: 'Forbidden: No token provided.' });
    }
    const token = authHeader.split('Bearer ')[1];
    let adminEmail: string;
    try {
      const decoded = await fbAuth.verifyIdToken(token);
      const userDoc = await db.collection('users').doc(decoded.uid).get();
      const isAdmin =
        decoded.email === 'admin_backend@bersamakita.org' ||
        decoded.email === 'contohasdf@gmail.com' ||
        decoded.email === 'bersamakita.my.id@protonmail.com' ||
        (userDoc.exists && userDoc.data()?.role === 'admin');
      if (!isAdmin) {
        return res.status(403).json({ success: false, message: 'Forbidden: Bukan admin.' });
      }
      adminEmail = decoded.email || decoded.uid;
    } catch (err: any) {
      return res.status(401).json({ success: false, message: 'Token tidak valid: ' + err.message });
    }

    // 2. Validasi input
    const { disasterId, amount, notes } = req.body || {};
    const nominal = Math.floor(Number(amount));
    if (!disasterId || !Number.isFinite(nominal) || nominal < MIN_WITHDRAWAL) {
      return res.status(400).json({
        success: false,
        message: `Parameter pencairan tidak valid. Minimal Rp${MIN_WITHDRAWAL.toLocaleString('id-ID')}.`,
      });
    }

    // 3. Data bencana & mitra
    const disasterSnap = await db.collection('disasters').doc(disasterId).get();
    if (!disasterSnap.exists) {
      return res.status(404).json({ success: false, message: 'Bencana tidak ditemukan.' });
    }
    const disaster = disasterSnap.data() || {};
    const partnerId = disaster.partnerId || null;
    const partnerName = disaster.partnerName || null;
    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: 'Bencana belum memiliki mitra lapangan. Tetapkan mitra sebelum pencairan.',
      });
    }

    // 4. Hitung saldo tersedia dari data NYATA (Admin SDK) — bukan dari client
    const [paidSnap, disbSnap] = await Promise.all([
      db.collection('donations').where('status', '==', 'paid').get(),
      db.collection('disbursements').get(),
    ]);

    let paidIn = 0;
    const sourceDonationIds: string[] = [];
    for (const doc of paidSnap.docs) {
      const don = doc.data();
      if (don.disasterId !== disasterId) continue;
      paidIn += Number(don.amount || 0);
      sourceDonationIds.push(doc.id);
    }

    let disbursed = 0;
    let inflight = 0;
    for (const doc of disbSnap.docs) {
      const d = doc.data();
      if (d.disasterId !== disasterId) continue;
      const outflow = disbursementOutflow(d);
      if (d.status === 'success') disbursed += outflow;
      else if (d.status === 'submitted' || d.status === 'processing') inflight += outflow;
    }
    const remaining = Math.max(0, paidIn - disbursed - inflight);

    // 5. Validasi saldo (server-side authoritative)
    const maxAllowed = maxWithdrawableAmount(remaining);
    if (nominal > maxAllowed) {
      return res.status(400).json({
        success: false,
        message: `Nominal melebihi maksimal pencairan Rp${maxAllowed.toLocaleString('id-ID')} (sisa kas Rp${remaining.toLocaleString('id-ID')} − biaya admin).`,
      });
    }

    const fee = calculateAdminFee(nominal);
    const totalOutflow = nominal + fee;
    const now = new Date().toISOString();
    const disbId = `disb-${Date.now()}`;
    const allocId = `alloc-${Date.now()}`;
    const timelineId = `tl-${Date.now()}`;

    // 6. Transaksi atomik: disbursement + allocation + audit + timeline
    await db.runTransaction(async (t) => {
      t.set(db.collection('disbursements').doc(disbId), {
        id: disbId,
        amount: nominal,
        fee,
        totalAmount: totalOutflow,
        partnerId,
        partnerName,
        disasterId,
        disasterTitle: disaster.title || '',
        status: 'submitted',
        provider: 'Transfer Bank Operasional / Duitku Payout Adapter',
        requestedAt: now,
        notes: notes || '',
        createdBy: adminEmail,
      });

      t.set(db.collection('partnerAllocations').doc(allocId), {
        id: allocId,
        disbursementId: disbId,
        partnerId,
        partnerName,
        disasterId,
        disasterTitle: disaster.title || '',
        amount: nominal,
        sourceDonationIds,
        status: 'allocated',
        allocatedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      t.set(db.collection('auditLogs').doc(`audit-${Date.now()}`), {
        id: `audit-${Date.now()}`,
        actorId: adminEmail,
        actorRole: 'admin',
        action: 'DISBURSEMENT_CREATED',
        entityType: 'disbursement',
        entityId: disbId,
        after: {
          amount: nominal,
          fee,
          totalAmount: totalOutflow,
          partnerId,
          partnerName,
          disasterId,
          disasterTitle: disaster.title || '',
        },
        timestamp: now,
      });

      // Timeline KOLEKTIF per bencana — sinyal untuk semua donatur disaster ini
      t.set(
        db.doc(`disasterTimeline/${disasterId}/events/${timelineId}`),
        {
          id: timelineId,
          disasterId,
          disasterTitle: disaster.title || '',
          type: 'disbursement_created',
          title: 'Pencairan Dana Diajukan',
          description: `Pencairan dana Rp${nominal.toLocaleString('id-ID')} (biaya admin Rp${fee.toLocaleString('id-ID')} → total keluar Rp${totalOutflow.toLocaleString('id-ID')}) diajukan ke ${partnerName} untuk bencana "${disaster.title}".`,
          amount: nominal,
          actorRole: 'admin',
          actorName: adminEmail,
          createdAt: now,
        }
      );
    });

    return res.json({
      success: true,
      data: { disbursementId: disbId, allocationId: allocId },
    });
  } catch (error: any) {
    console.error('Fundraising create disbursement error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;