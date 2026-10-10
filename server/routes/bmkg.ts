import { Router, Request, Response } from 'express';

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

export default router;
