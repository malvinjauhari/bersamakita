import express from 'express';
import path from 'path';
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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const port = process.env.PORT || 3005;

app.use(express.json({ limit: '10mb' }));

// Import Routes
import bmkgRoutes from './routes/bmkg.js';
import paymentsRoutes from './routes/payments.js';
import transparencyRoutes from './routes/transparency.js';
import adminRoutes from './routes/admin.js';
import imagesRoutes from './routes/images.js';

app.use('/api/bmkg', bmkgRoutes);
app.use('/api/payments/duitku', paymentsRoutes);
app.use('/api/transparency', transparencyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/images', imagesRoutes);

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(rootDir, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`Bersama Kita fullstack server running on http://0.0.0.0:${port}`);
  });
}

// On Vercel the app is exported as a serverless function;
// no local listener or Vite middleware is needed there.
if (!process.env.VERCEL) {
  startServer();
}

export { app };
