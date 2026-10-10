import { Router, Request, Response } from 'express';
import { adminDb, adminAuth } from '../../src/config/firebase-admin.js';

const router = Router();

router.post('/create-partner', async (req: Request, res: Response): Promise<any> => {
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
router.post('/reset-transactions', async (req: Request, res: Response): Promise<any> => {
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


export default router;
