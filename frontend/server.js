import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the Vite build output
app.use(express.static(path.join(__dirname, 'dist'), { maxAge: '1y', immutable: true }));

// SPA fallback — all routes serve index.html
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🌐 Frontend running on http://localhost:${PORT}`);
});

