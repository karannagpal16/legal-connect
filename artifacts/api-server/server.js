import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Path fix: Build folder (dist) ko point karo
const distPath = path.join(__dirname, 'dist');

// Static files serve karo
app.use(express.static(distPath));

// Fallback: Wildcard (*) ki jagah simple route handle karo
app.get('/', (req, res) => {
  res.sendFile(path.join(distPath, 'index.mjs'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));