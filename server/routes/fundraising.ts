import { Router } from 'express';
import { adminDb } from '../../src/config/firebase-admin.js';
import { ADMIN_FEE_RATE } from '../../src/lib/fees.js';
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

export default router;