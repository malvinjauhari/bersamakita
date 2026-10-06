import type { Request, Response } from 'express';
import { app } from '../server';

// JSON 404 for any unmatched /api/* route — guarantees the API never returns HTML
// (prevents "Unexpected token '<'" errors in the frontend).
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

export default app;
