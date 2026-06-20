import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Root directory ka path ensure karo
const distPath = path.resolve(__dirname, 'dist'); 

app.use(express.static(distPath));

// Wildcard route ko handle karo taaki SPA sahi se load ho
app.get('/*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));