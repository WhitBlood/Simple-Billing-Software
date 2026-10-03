import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// ─── Runtime Config ────────────────────────────────────────────────────────
// Served as /config.js and loaded by index.html BEFORE the React bundle.
// Exposes server-side env vars to the browser at runtime — no image rebuild needed.
//
// Set BACKEND_URL on the pod via:
//   - K8s Secret (AWS Secrets Manager + ESO)  → k8s/external-secret.yaml
//   - K8s ConfigMap                           → k8s/configmap.yaml
//   - Inline env in the Deployment            → k8s/frontend-deployment.yaml
app.get('/config.js', (_req, res) => {
  const config = {
    BACKEND_URL: process.env.BACKEND_URL || '',   // e.g. https://api.example.com  or empty → use relative /api
  };
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-store');     // never cache — must be fresh on every load
  res.send(`window.__ENV__ = ${JSON.stringify(config)};`);
});

// Serve static files from the Vite build output
// Hashed assets are cached for 1 year; index.html is never cached so new deploys show up immediately.
app.use(
  express.static(path.join(__dirname, 'dist'), {
    maxAge: '1y',
    immutable: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-store');
      }
    },
  })
);

// /api/* is NOT served by this server. Behind an ingress it is routed to the backend;
// if a request reaches here, return JSON (not index.html) so the error is clear.
app.use('/api', (_req, res) => {
  res.status(502).json({
    error: 'API request reached the frontend server. Set BACKEND_URL or route /api to the backend service.',
  });
});

// SPA fallback — all non-file routes serve index.html
// (app.use instead of app.get('*') so it works on both Express 4 and 5)
app.use((_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🌐 Frontend running on http://localhost:${PORT}`);
  console.log(`   BACKEND_URL = ${process.env.BACKEND_URL || '(not set — using relative /api)'}`);
});
