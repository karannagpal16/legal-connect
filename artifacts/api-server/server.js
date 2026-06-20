import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const distPath = path.resolve(__dirname, 'dist');

app.use(express.static(distPath));

// '/*' ke bajaye simple route aur static files ka handle
app.get('*', (req, res) => {
  // Check karo ki request kisi file ke liye toh nahi hai
  if (req.url.startsWith('/api')) {
    return res.status(404).send('API not found');
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));