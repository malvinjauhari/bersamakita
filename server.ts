import express, { Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Polyfill fetch to include Referer for Firebase API key restrictions in Node
const originalFetch = global.fetch;
global.fetch = function(url, options) {
  const newOptions = options ? { ...options } : {};
  const appUrl = process.env.APP_URL || 'http://localhost:3005';
  newOptions.headers = { ...newOptions.headers, 'Referer': `${appUrl.replace(/\/$/, '')}/` };
  return originalFetch(url, newOptions);
};

import { adminDb, adminAuth } from './src/config/firebase-admin.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3005;

app.use(express.json({ limit: '10mb' }));

// BMKG API Proxy to bypass browser CORS and provide fallback handling
app.get('/api/bmkg/autogempa', async (_req: Request, res: Response) => {
  try {
    const response = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json', {
      headers: { 'User-Agent': 'BersamaKita/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      throw new Error(`BMKG server responded with status: ${response.status}`);
    }
    const data = await response.json();
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('BMKG autogempa fetch error:', error.message);
    res.status(502).json({
      success: false,
      message: 'Gagal mengambil data gempa terkini dari BMKG: ' + error.message,
    });
  }
});

app.get('/api/bmkg/gempaterkini', async (_req: Request, res: Response) => {
  try {
    const response = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json', {
      headers: { 'User-Agent': 'BersamaKita/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      throw new Error(`BMKG server responded with status: ${response.status}`);
    }
    const data = await response.json();
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('BMKG gempaterkini fetch error:', error.message);
    res.status(502).json({
      success: false,
      message: 'Gagal mengambil daftar gempa dari BMKG: ' + error.message,
    });
  }
});

// Duitku Payment Gateway Backend Logic
app.post('/api/payments/duitku/create', async (req: Request, res: Response) => {
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

    const merchantOrderId = donationId;
    const paymentAmount = amount;
    const signatureRaw = merchantCode + merchantOrderId + paymentAmount + apiKey;
    const signature = crypto.createHash('md5').update(signatureRaw).digest('hex');

    const bodyObj: any = {
      merchantCode: merchantCode,
      merchantOrderId: merchantOrderId,
      paymentAmount: paymentAmount,
      paymentMethod: paymentMethod || "", 
      productDetails: "Donasi Bersama Kita",
      email: donorEmail || 'donatur@bersamakita.org',
      phoneNumber: donorPhone || '081234567890',
      customerVaName: donorName || 'Hamba Allah',
      callbackUrl: `${process.env.APP_URL || 'http://localhost:3005'}/api/payments/duitku/callback`,
      returnUrl: `${process.env.APP_URL || 'http://localhost:3005'}/transaction/status/${donationId}`,
      signature: signature,
      expiryPeriod: 1440
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
    });
  } catch (error: any) {
    console.error('Payment create error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Duitku Callback Endpoint
app.post('/api/payments/duitku/callback', async (req: Request, res: Response) => {
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
app.post('/api/payments/duitku/check-status', async (req: Request, res: Response) => {
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
            paidAmount: Number(duitkuData.amount || paymentDoc.data().amount),
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


// Admin-protected endpoint for creating Partner accounts
app.post('/api/admin/create-partner', async (req: Request, res: Response): Promise<any> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(403).json({ success: false, error: 'Forbidden: No token provided' });
    }
    const token = authHeader.split('Bearer ')[1];
    if (!adminAuth || !adminDb) {
      return res.status(500).json({ success: false, error: 'Firebase Admin SDK not fully initialized' });
    }
    
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Check if admin
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const isAdmin = 
      decodedToken.email === 'admin_backend@bersamakita.org' || 
      decodedToken.email === 'contohasdf@gmail.com' ||
      (userDoc.exists && userDoc.data()?.role === 'admin');
      
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
    }

    const { email, password, name, organization, contact, area } = req.body;
    if (!email || !password || !name || !organization) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Create Firebase Auth user
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    const partnerId = userRecord.uid;
    const now = new Date().toISOString();

    // Create User profile with role: partner
    await adminDb.collection('users').doc(partnerId).set({
      id: partnerId,
      email,
      displayName: name,
      role: 'partner',
      createdAt: now,
      updatedAt: now
    });

    // Create Partner profile
    const partnerData = {
      id: partnerId,
      userId: partnerId,
      name,
      email, // Keep email in partner collection for reference
      organization,
      contact: contact || '',
      operationalArea: area || '',
      status: 'active',
      verifiedAt: now,
      createdAt: now,
      updatedAt: now
    };
    await adminDb.collection('partners').doc(partnerId).set(partnerData);

    return res.json({ success: true, partner: partnerData });
  } catch (err: any) {
    console.error('Error creating partner:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin-protected endpoint for resetting transaction data
app.post('/api/admin/reset-transactions', async (req: Request, res: Response): Promise<any> => {
  try {
    // In a real app, verify admin token from req.headers.authorization
    const authHeader = req.headers.authorization;
    const adminSecret = process.env.ADMIN_SECRET_KEY;
    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (!adminDb) {
      return res.status(500).json({ success: false, message: 'Firebase Admin not initialized' });
    }

    const collectionsToDelete = [
      'donations',
      'payments',
      'disbursements',
      'partnerAllocations',
      'distributionReports',
      'distributions',
      'trackingEvents'
    ];

    let totalDeleted = 0;

    for (const collName of collectionsToDelete) {
      const collRef = adminDb.collection(collName);
      const snapshot = await collRef.get();
      
      let batch = adminDb.batch();
      let count = 0;

      for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        count++;
        totalDeleted++;

        if (count === 500) {
          await batch.commit();
          batch = adminDb.batch();
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }
    }

    res.json({
      success: true,
      message: 'Transaction data successfully reset.',
      deletedCount: totalDeleted
    });
  } catch (error: any) {
    console.error('Reset transactions error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`Bersama Kita fullstack server running on http://0.0.0.0:${port}`);
  });
}

// On Vercel the app is exported as a serverless function (see api/[...path].ts);
// no local listener or Vite middleware is needed there.
if (!process.env.VERCEL) {
  startServer();
}

export { app };
