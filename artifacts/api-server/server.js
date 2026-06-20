import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Ye logic: agar prefix 'artifacts/api-server/' path mein hai toh use trim kar dega
const currentDir = process.cwd();
const rootDir = currentDir.endsWith('api-server') ? path.resolve(currentDir, '../../') : currentDir;

app.use(express.static(rootDir));

app.get('*', (req, res) => {
  // Check karta hai ki file exist karti hai ya nahi
  const indexPath = path.join(rootDir, 'index.html');
  res.sendFile(indexPath);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));