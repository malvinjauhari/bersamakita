import { Router, Request, Response } from 'express';
import { adminDb } from '../../src/config/firebase-admin.js';
import { ADMIN_FEE_RATE } from '../../src/lib/fees.js';

const router = Router();

router.get('/summary', async (_req: Request, res: Response) => {
  try {
    if (!adminDb) {
      return res.status(500).json({ success: false, message: 'Firebase Admin not initialized.' });
    }

    const [donationsSnap, paymentsSnap] = await Promise.all([
      adminDb.collection('donations').where('status', '==', 'paid').get(),
      adminDb.collection('payments').where('status', '==', 'paid').get(),
    ]);

    // Index payments by donationId (and doc id) for the join
    const paymentByDonationId = new Map<string, any>();
    for (const doc of paymentsSnap.docs) {
      const data = doc.data();
      if (data.donationId) paymentByDonationId.set(data.donationId, data);
    }

    const paidDonations = donationsSnap.docs
      .map((doc) => doc.data())
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    let totalReceived = 0;
    let totalAdminFees = 0;
    const disasterMap = new Map<
      string,
      { disasterId: string; disasterTitle: string; totalCollected: number; donationCount: number }
    >();

    const transactions = paidDonations.map((don: any) => {
      const payment =
        paymentByDonationId.get(don.id) ||
        (don.paymentId ? paymentByDonationId.get(don.paymentId) : undefined) ||
        null;

      const amount = Number(don.amount || 0);
      const adminFee = Number(payment?.fee || 0);
      totalReceived += amount;
      totalAdminFees += adminFee;

      const disasterId = don.disasterId || '';
      const disasterTitle = don.disasterTitle || 'Donasi Umum';
      const key = disasterId || '__none__';
      const row =
        disasterMap.get(key) ||
        { disasterId, disasterTitle, totalCollected: 0, donationCount: 0 };
      row.totalCollected += amount;
      row.donationCount += 1;
      disasterMap.set(key, row);

      // QRIS is the only supported method; legacy records keep their real channel
      const rawChannel = String(payment?.paymentChannel || 'QRIS');
      const paymentMethod = /qris/i.test(rawChannel) ? 'QRIS' : rawChannel;

      return {
        id: don.id,
        donorName: don.donorName || 'Hamba Allah',
        amount,
        adminFee,
        totalPaid: amount + adminFee,
        paymentMethod,
        paidAt: payment?.paidAt || payment?.updatedAt || don.updatedAt || don.createdAt,
        disasterId,
        disasterTitle,
        keterangan: don.message || `Donasi untuk ${disasterTitle}`,
        createdAt: don.createdAt,
      };
    });

    const disasters = Array.from(disasterMap.values()).sort(
      (a, b) => b.totalCollected - a.totalCollected
    );

    return res.json({
      success: true,
      data: {
        totalReceived,
        totalAdminFees,
        totalTransactions: paidDonations.length,
        adminFeeRate: ADMIN_FEE_RATE,
        disasters,
        transactions: transactions.slice(0, 100),
      },
    });
  } catch (error: any) {
    console.error('Transparency summary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


export default router;
