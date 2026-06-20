import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Static files serve karo
app.use(express.static(path.join(__dirname, 'dist')));

// Wildcard issue fix karne ke liye regex ka use
app.get(/(.*)/, (req, res, next) => {
  // Agar API route hai toh aage badho
  if (req.path.startsWith('/api')) return next();
  
  // Warna index.html serve karo
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));