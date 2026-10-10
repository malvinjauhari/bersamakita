import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { adminDb } from '../../src/config/firebase-admin.js';
import { calculateAdminFee, calculateTotalPayment } from '../../src/lib/fees.js';

const router = Router();

router.post('/create', async (req: Request, res: Response) => {
  try {
    const {
      donationId,
      amount,
      donorName,
      donorEmail,
      donorPhone,
      paymentMethod,
    } = req.body;

    if (!donationId || !amount || amount < 10000) {
      return res.status(400).json({
        success: false,
        message: 'Parameter donasi tidak valid. Minimum donasi Rp10.000.',
      });
    }

    // QRIS is the only supported payment method (SP = ShopeePay QRIS).
    const allowedPaymentMethods = ['SP'];
    if (paymentMethod && !allowedPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Metode pembayaran tidak didukung. Hanya QRIS.',
      });
    }

    const merchantCode = process.env.DUITKU_MERCHANT_CODE;
    const apiKey = process.env.DUITKU_API_KEY;
    const isSandbox = (process.env.DUITKU_ENVIRONMENT || 'sandbox') === 'sandbox';

    if (!merchantCode || !apiKey) {
      return res.status(500).json({
        success: false,
        message: 'Konfigurasi Duitku belum diatur di server.',
      });
    }

    const duitkuUrl = isSandbox
      ? 'https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry'
      : 'https://passport.duitku.com/webapi/api/merchant/v2/inquiry';

    // Transparent admin fee: charged ON TOP of the donation so the recorded
    // donation amount stays whole. Total Dibayar = Nominal + (Nominal × 0,17%).
    const donationAmount = Math.round(amount);
    const adminFee = calculateAdminFee(donationAmount);
    const paymentAmount = calculateTotalPayment(donationAmount);

    const merchantOrderId = donationId;
    const signatureRaw = merchantCode + merchantOrderId + paymentAmount + apiKey;
    const signature = crypto.createHash('md5').update(signatureRaw).digest('hex');

    const bodyObj: any = {
      merchantCode: merchantCode,
      merchantOrderId: merchantOrderId,
      paymentAmount: paymentAmount,
      paymentMethod: 'SP',
      productDetails: "Donasi Bersama Kita",
      email: donorEmail || 'donatur@bersamakita.org',
      phoneNumber: donorPhone || '081234567890',
      customerVaName: donorName || 'Hamba Allah',
      callbackUrl: `${process.env.APP_URL || 'http://localhost:3005'}/api/payments/duitku/callback`,
      returnUrl: `${process.env.APP_URL || 'http://localhost:3005'}/transaction/status/${donationId}`,
      signature: signature,
      expiryPeriod: 60 // minutes — kept in sync with the checkout countdown
    };

    const duitkuRes = await fetch(duitkuUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyObj),
    });

    const duitkuData = await duitkuRes.json();
    
    if (duitkuData.statusCode !== '00') {
      console.error('Duitku create error details:', duitkuData);
      const duitkuMessage = duitkuData.statusMessage || duitkuData.Message || 'Gagal create invoice Duitku';
      return res.status(400).json({ success: false, message: duitkuMessage, raw: duitkuData });
    }

    return res.json({
      success: true,
      reference: duitkuData.reference,
      paymentUrl: duitkuData.paymentUrl,
      qrString: duitkuData.qrString,
      vaNumber: duitkuData.vaNumber,
      fee: adminFee,
      totalAmount: paymentAmount,
    });
  } catch (error: any) {
    console.error('Payment create error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Duitku Callback Endpoint
router.post('/callback', async (req: Request, res: Response) => {
  try {
    const { merchantCode, amount, merchantOrderId, signature, reference, resultCode } = req.body;
    
    const apiKey = process.env.DUITKU_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'Duitku API Key not configured' });
    }
    const expectedSignatureRaw = merchantCode + amount + merchantOrderId;
    const expectedSignature = crypto.createHmac('sha256', apiKey).update(expectedSignatureRaw).digest('hex');

    if (signature !== expectedSignature) {
      return res.status(403).json({ success: false, message: 'Invalid signature' });
    }

    if (!adminDb) {
      console.error('Firebase Admin not initialized for callback');
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    if (resultCode === '00') {
      console.log(`Duitku payment SUCCESS for donation ${merchantOrderId} (Ref: ${reference})`);
      
      const paymentsRef = adminDb.collection('payments');
      const paymentSnap = await paymentsRef.where('donationId', '==', merchantOrderId).limit(1).get();
      
      if (paymentSnap.empty) {
        console.warn(`Payment not found for donation ${merchantOrderId}`);
        return res.json({ success: true, message: 'Callback processed, transaction not found' });
      }

      const paymentDoc = paymentSnap.docs[0];
      const paymentData = paymentDoc.data();

      // Idempotency check
      if (paymentData.status === 'paid') {
        console.log(`Payment ${merchantOrderId} already marked as paid.`);
        return res.json({ success: true, message: 'Callback processed (Idempotent)' });
      }

      const batch = adminDb.batch();
      
      // Update Payment
      batch.update(paymentDoc.ref, {
        status: 'paid',
        paidAmount: Number(amount),
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Update Donation
      const donationRef = adminDb.collection('donations').doc(merchantOrderId);
      const donationSnap = await donationRef.get();
      
      if (donationSnap.exists) {
        batch.update(donationRef, {
          status: 'paid',
          updatedAt: new Date().toISOString()
        });

        // Add Tracking Event
        const trackingRef = adminDb.collection('trackingEvents').doc();
        batch.set(trackingRef, {
          id: trackingRef.id,
          donationId: merchantOrderId,
          userId: donationSnap.data()?.userId || 'guest',
          type: 'funds_recorded',
          title: 'Dana Donasi Diterima',
          description: 'Pembayaran donasi telah berhasil diverifikasi oleh sistem.',
          timestamp: new Date().toISOString(),
          visibleToUser: true,
          createdBy: 'system'
        });
      }

      await batch.commit();
      console.log(`Firestore updated successfully for payment ${merchantOrderId}`);
    } else {
      console.log(`Duitku payment FAILED/EXPIRED for donation ${merchantOrderId}`);
      
      const paymentsRef = adminDb.collection('payments');
      const paymentSnap = await paymentsRef.where('donationId', '==', merchantOrderId).limit(1).get();
      
      if (!paymentSnap.empty) {
        const paymentDoc = paymentSnap.docs[0];
        const paymentData = paymentDoc.data();
        
        if (paymentData.status === 'pending') {
          const newStatus = resultCode === '01' ? 'failed' : 'expired';
          const batch = adminDb.batch();
          
          batch.update(paymentDoc.ref, {
            status: newStatus,
            updatedAt: new Date().toISOString()
          });

          const donationRef = adminDb.collection('donations').doc(merchantOrderId);
          batch.update(donationRef, {
            status: newStatus,
            updatedAt: new Date().toISOString()
          });

          await batch.commit();
        }
      }
    }

    // Acknowledge the callback
    res.json({ success: true, message: 'Callback processed' });
  } catch (err: any) {
    console.error('Duitku callback error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Duitku Check Status Endpoint
router.post('/check-status', async (req: Request, res: Response) => {
  try {
    const { merchantOrderId } = req.body;
    
    if (!merchantOrderId) {
      return res.status(400).json({ success: false, message: 'merchantOrderId is required' });
    }

    const merchantCode = process.env.DUITKU_MERCHANT_CODE;
    const apiKey = process.env.DUITKU_API_KEY;
    const isSandbox = (process.env.DUITKU_ENVIRONMENT || 'sandbox') === 'sandbox';

    if (!merchantCode || !apiKey) {
      return res.status(500).json({ success: false, message: 'Duitku API Key not configured' });
    }

    const signatureRaw = merchantCode + merchantOrderId;
    const signature = crypto.createHmac('sha256', apiKey).update(signatureRaw).digest('hex');

    const duitkuUrl = isSandbox
      ? 'https://sandbox.duitku.com/webapi/api/merchant/transactionStatus'
      : 'https://passport.duitku.com/webapi/api/merchant/transactionStatus';

    const bodyObj = {
      merchantCode,
      merchantOrderId,
      signature
    };

    const duitkuRes = await fetch(duitkuUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyObj),
    });

    const duitkuData = await duitkuRes.json();
    
    if (duitkuData.statusCode === '00' && adminDb) {
      // Sync SUCCESS status to DB if it's 00 (Success)
      const paymentsRef = adminDb.collection('payments');
      const paymentSnap = await paymentsRef.where('donationId', '==', merchantOrderId).limit(1).get();
      
      if (!paymentSnap.empty) {
        const paymentDoc = paymentSnap.docs[0];
        if (paymentDoc.data().status !== 'paid') {
          const batch = adminDb.batch();
          batch.update(paymentDoc.ref, {
            status: 'paid',
            paidAmount: Number(
              duitkuData.amount ||
                Number(paymentDoc.data().amount || 0) + Number(paymentDoc.data().fee || 0)
            ),
            paidAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          const donationRef = adminDb.collection('donations').doc(merchantOrderId);
          batch.update(donationRef, {
            status: 'paid',
            updatedAt: new Date().toISOString()
          });
          await batch.commit();
        }
      }
    } else if (duitkuData.statusCode === '02' && adminDb) {
      // Sync FAILED/EXPIRED status
      const paymentsRef = adminDb.collection('payments');
      const paymentSnap = await paymentsRef.where('donationId', '==', merchantOrderId).limit(1).get();
      
      if (!paymentSnap.empty) {
        const paymentDoc = paymentSnap.docs[0];
        if (paymentDoc.data().status === 'pending') {
          const batch = adminDb.batch();
          batch.update(paymentDoc.ref, {
            status: 'failed',
            updatedAt: new Date().toISOString()
          });
          const donationRef = adminDb.collection('donations').doc(merchantOrderId);
          batch.update(donationRef, {
            status: 'failed',
            updatedAt: new Date().toISOString()
          });
          await batch.commit();
        }
      }
    }

    return res.json({
      success: true,
      statusCode: duitkuData.statusCode,
      statusMessage: duitkuData.statusMessage,
      reference: duitkuData.reference
    });

  } catch (err: any) {
    console.error('Duitku check status error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// Sandbox-only demo endpoint: mark a pending payment as paid in one click.
// Locked behind DUITKU_ENVIRONMENT=sandbox so it can never run in live mode.
router.post('/simulate-paid', async (req: Request, res: Response) => {
  try {
    if ((process.env.DUITKU_ENVIRONMENT || 'sandbox') !== 'sandbox') {
      return res.status(403).json({
        success: false,
        message: 'Simulasi pembayaran hanya tersedia di mode sandbox.',
      });
    }

    const { merchantOrderId } = req.body;
    if (!merchantOrderId) {
      return res.status(400).json({ success: false, message: 'merchantOrderId is required.' });
    }
    if (!adminDb) {
      return res.status(500).json({ success: false, message: 'Firebase Admin not initialized.' });
    }

    const paymentsRef = adminDb.collection('payments');
    const paymentSnap = await paymentsRef.where('donationId', '==', merchantOrderId).limit(1).get();
    if (paymentSnap.empty) {
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
    }

    const paymentDoc = paymentSnap.docs[0];
    const paymentData = paymentDoc.data();

    // Idempotency: already paid → acknowledge without mutating
    if (paymentData.status === 'paid') {
      return res.json({ success: true, message: 'Pembayaran sudah lunas.' });
    }
    if (paymentData.status !== 'pending') {
      return res.status(409).json({
        success: false,
        message: 'Transaksi tidak dalam status menunggu pembayaran.',
      });
    }

    const now = new Date().toISOString();
    const batch = adminDb.batch();

    batch.update(paymentDoc.ref, {
      status: 'paid',
      paidAmount: Number(paymentData.amount || 0) + Number(paymentData.fee || 0),
      paidAt: now,
      updatedAt: now,
    });

    const donationRef = adminDb.collection('donations').doc(merchantOrderId);
    const donationSnap = await donationRef.get();
    if (donationSnap.exists) {
      batch.update(donationRef, { status: 'paid', updatedAt: now });

      const trackingRef = adminDb.collection('trackingEvents').doc();
      batch.set(trackingRef, {
        id: trackingRef.id,
        donationId: merchantOrderId,
        userId: donationSnap.data()?.userId || 'guest',
        type: 'funds_recorded',
        title: 'Dana Donasi Diterima',
        description: 'Pembayaran donasi telah berhasil diverifikasi oleh sistem.',
        timestamp: now,
        visibleToUser: true,
        createdBy: 'system',
      });
    }

    await batch.commit();
    console.log(`[sandbox] Simulated payment marked paid for donation ${merchantOrderId}`);
    return res.json({ success: true, message: 'Pembayaran disimulasikan sebagai lunas (sandbox).' });
  } catch (error: any) {
    console.error('Simulate paid error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Scheduled sweep: donations stuck in pending_payment past the 60-minute
// expiry window are resolved against Duitku transactionStatus (00 → paid,
// otherwise → failed). Triggered by Vercel Cron, protected by CRON_SECRET.
router.get('/expire-sweep', async (req: Request, res: Response) => {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const auth = req.headers.authorization || '';
      if (auth !== `Bearer ${cronSecret}`) {
        return res.status(403).json({ success: false, message: 'Unauthorized.' });
      }
    }

    if (!adminDb) {
      return res.status(500).json({ success: false, message: 'Firebase Admin not initialized.' });
    }

    const merchantCode = process.env.DUITKU_MERCHANT_CODE;
    const apiKey = process.env.DUITKU_API_KEY;
    const isSandbox = (process.env.DUITKU_ENVIRONMENT || 'sandbox') === 'sandbox';

    const TTL_MINUTES = 60;
    const cutoff = Date.now() - TTL_MINUTES * 60 * 1000;

    const pendingSnap = await adminDb
      .collection('donations')
      .where('status', '==', 'pending_payment')
      .get();

    const stale = pendingSnap.docs.filter((d) => {
      const created = new Date(d.data().createdAt || 0).getTime();
      return created < cutoff;
    });

    let paidCount = 0;
    let failedCount = 0;
    let checked = 0;

    for (const doc of stale) {
      const merchantOrderId = doc.id;
      checked++;

      // Ask Duitku for the authoritative final status first
      let finalPaid = false;
      if (merchantCode && apiKey) {
        try {
          const signatureRaw = merchantCode + merchantOrderId;
          const signature = crypto.createHmac('sha256', apiKey).update(signatureRaw).digest('hex');
          const duitkuUrl = isSandbox
            ? 'https://sandbox.duitku.com/webapi/api/merchant/transactionStatus'
            : 'https://passport.duitku.com/webapi/api/merchant/transactionStatus';
          const statusRes = await fetch(duitkuUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ merchantCode, merchantOrderId, signature }),
          });
          const statusData = await statusRes.json();
          finalPaid = statusData.statusCode === '00';
        } catch (e: any) {
          console.warn(`Expire sweep status check failed for ${merchantOrderId}:`, e.message);
        }
      }

      const paymentSnap = await adminDb
        .collection('payments')
        .where('donationId', '==', merchantOrderId)
        .limit(1)
        .get();
      if (paymentSnap.empty) {
        // No payment record to settle — just close the donation out
        const newStatus = finalPaid ? 'paid' : 'failed';
        await doc.ref.update({ status: newStatus, updatedAt: new Date().toISOString() });
        finalPaid ? paidCount++ : failedCount++;
        continue;
      }

      const paymentDoc = paymentSnap.docs[0];
      if (paymentDoc.data().status === 'paid') {
        // Idempotent — skip
        continue;
      }

      const now = new Date().toISOString();
      const newStatus = finalPaid ? 'paid' : 'failed';
      const batch = adminDb.batch();

      batch.update(paymentDoc.ref, {
        status: newStatus,
        ...(finalPaid
          ? {
              paidAmount:
                Number(paymentDoc.data().amount || 0) + Number(paymentDoc.data().fee || 0),
              paidAt: now,
            }
          : {}),
        updatedAt: now,
      });
      batch.update(doc.ref, { status: newStatus, updatedAt: now });

      if (finalPaid) {
        const trackingRef = adminDb.collection('trackingEvents').doc();
        batch.set(trackingRef, {
          id: trackingRef.id,
          donationId: merchantOrderId,
          userId: doc.data()?.userId || 'guest',
          type: 'funds_recorded',
          title: 'Dana Donasi Diterima',
          description: 'Pembayaran donasi telah berhasil diverifikasi oleh sistem.',
          timestamp: now,
          visibleToUser: true,
          createdBy: 'system',
        });
        paidCount++;
      } else {
        failedCount++;
      }

      await batch.commit();
    }

    return res.json({ success: true, checked, paid: paidCount, failed: failedCount });
  } catch (error: any) {
    console.error('Expire sweep error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


export default router;
