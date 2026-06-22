import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM (import/export) ke liye __dirname setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 'dist' folder se static files serve karega
app.use(express.static(path.join(__dirname, 'dist')));

// Saare requests ke liye 'index.html' serve karega (React/SPA routing ke liye)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Render ka assigned port ya default 10000
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server is successfully running on port ${PORT}`);
});