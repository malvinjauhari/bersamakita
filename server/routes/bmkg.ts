import { Router, Request, Response } from 'express';
import { adminDb, adminAuth } from '../../src/config/firebase-admin.js';
import { normalizeBMKG } from '../../src/services/bmkg.js';

const router = Router();

router.get('/autogempa', async (_req: Request, res: Response) => {
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

router.get('/gempaterkini', async (_req: Request, res: Response) => {
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

// ---------------------------------------------------------------------------
// POST /api/bmkg/refresh
// Ingest BMKG via SERVER (Admin SDK) — dipakai tombol "Refresh BMKG" pengguna
// biasa. Klien TIDAK lagi menulis langsung ke `earthquakeEvents`/`disasters`
// (mendukung hardening firestore.rules: earthquakes → admin, disasters →
// admin/partner). Semua data masuk sebagai `pending_verification` (aturan
// AGENTS: BMKG tidak pernah otomatis publik). Re-sync tidak pernah
// menimpa field admin (status/partner/verifikasi).
// Auth: Bearer <Firebase ID Token> — pengguna mana pun yang login.
// ---------------------------------------------------------------------------
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    if (!adminDb || !adminAuth) {
      return res.status(500).json({ success: false, message: 'Firebase Admin not initialized.' });
    }
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(403).json({ success: false, message: 'Forbidden: No token provided.' });
    }
    const token = authHeader.split('Bearer ')[1];
    let userId: string;
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      userId = decoded.uid;
    } catch (err: any) {
      return res.status(401).json({ success: false, message: 'Token tidak valid: ' + err.message });
    }

    const [autoRes, listRes] = await Promise.all([
      fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json', {
        headers: { 'User-Agent': 'BersamaKita/1.0' },
        signal: AbortSignal.timeout(8000),
      }),
      fetch('https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json', {
        headers: { 'User-Agent': 'BersamaKita/1.0' },
        signal: AbortSignal.timeout(8000),
      }),
    ]);
    if (!autoRes.ok || !listRes.ok) {
      throw new Error('BMKG server responded with non-200 status.');
    }
    const autoJson = await autoRes.json();
    const listJson = await listRes.json();

    const rawList: any[] = autoJson?.Infogempa?.gempa
      ? [autoJson.Infogempa.gempa]
      : autoJson?.data?.Infogempa?.gempa
      ? [autoJson.data.Infogempa.gempa]
      : [];
    const recentList: any[] = listJson?.Infogempa?.gempa
      ? listJson.Infogempa.gempa
      : listJson?.data?.Infogempa?.gempa
      ? listJson.data.Infogempa.gempa
      : [];

    const items = [
      ...rawList.map((raw) => normalizeBMKG(raw, 'auto')),
      ...recentList.map((raw, index) => normalizeBMKG(raw, `recent-${index}`)),
    ];
    const seen = new Set<string>();
    const unique = items.filter((it) => {
      if (seen.has(it.disaster.id)) return false;
      seen.add(it.disaster.id);
      return true;
    });

    let ingested = 0;
    for (const it of unique) {
      await adminDb
        .collection('earthquakeEvents')
        .doc(it.event.id)
        .set({ ...it.event }, { merge: true });

      const dRef = adminDb.collection('disasters').doc(it.disaster.id);
      const existing = await dRef.get();
      if (existing.exists) {
        // BMKG re-sync: hanya refresh field mentah — JANGAN sentuh status,
        // partner, verifikasi, dll milik admin.
        const bmkgData = {
          earthquakeEventId: it.disaster.earthquakeEventId,
          title: it.disaster.title,
          magnitude: it.disaster.magnitude,
          depth: it.disaster.depth,
          location: it.disaster.location,
          coordinates: it.disaster.coordinates,
          eventTime: it.disaster.eventTime,
          updatedAt: new Date().toISOString(),
        };
        await dRef.set(bmkgData, { merge: true });
      } else {
        await dRef.set(
          {
            ...it.disaster,
            status: 'pending_verification',
            verificationMethod: 'pending',
          },
          { merge: true }
        );
      }
      ingested += 1;
    }

    return res.json({ success: true, data: { ingested, userId } });
  } catch (error: any) {
    console.error('BMKG refresh error:', error.message);
    res.status(502).json({ success: false, message: 'Gagal refreshing BMKG: ' + error.message });
  }
});

export default router;
