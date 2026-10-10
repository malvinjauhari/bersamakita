import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { adminDb, adminAuth } from '../../src/config/firebase-admin.js';

const router = Router();

router.post('/sign', async (req: Request, res: Response): Promise<any> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized: token tidak ditemukan' });
    }
    if (!adminAuth || !adminDb) {
      return res.status(500).json({ success: false, message: 'Firebase Admin SDK belum terinisialisasi' });
    }

    const decodedToken = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const role = userDoc.exists ? userDoc.data()?.role : undefined;
    // Mirrors isAdmin()/isPartner() in firestore.rules so the same accounts
    // are allowed here as are allowed to write image fields directly.
    const isPrivileged =
      role === 'admin' ||
      role === 'partner' ||
      decodedToken.email === 'admin_backend@bersamakita.org' ||
      decodedToken.email === 'contohasdf@gmail.com' ||
      decodedToken.email === 'bersamakita.my.id@protonmail.com' ||
      decodedToken.email === 'partnerbersamakita@protonmail.com';

    if (!isPrivileged) {
      return res.status(403).json({ success: false, message: 'Forbidden: akses admin/partner diperlukan' });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({ success: false, message: 'Konfigurasi Cloudinary belum diatur di server.' });
    }

    const allowedFolders = [
      'bersamakita/reports',
      'bersamakita/evidence',
      'bersamakita/partners',
    ];
    const folder = typeof req.body?.folder === 'string' ? req.body.folder : '';
    if (!allowedFolders.includes(folder)) {
      return res.status(400).json({ success: false, message: 'Folder upload tidak diizinkan.' });
    }

    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = { folder, timestamp };
    const toSign = Object.keys(paramsToSign)
      .sort()
      .map((key) => `${key}=${paramsToSign[key as keyof typeof paramsToSign]}`)
      .join('&');
    const signature = crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');

    return res.json({
      success: true,
      data: { cloudName, apiKey, timestamp, signature, folder },
    });
  } catch (error: any) {
    console.error('Cloudinary sign error:', error?.message || error);
    return res.status(401).json({ success: false, message: 'Gagal memverifikasi sesi upload: ' + (error?.message || 'unknown') });
  }
});


export default router;
