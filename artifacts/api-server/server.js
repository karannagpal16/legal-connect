import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Root Directory 'artifacts/api-server' set hai, toh dist ka path ye hoga:
const distPath = path.resolve(__dirname, 'dist'); 

app.use(express.static(distPath));

app.use((req, res, next) => {
  if (!req.path.includes('.')) {
    return res.sendFile(path.join(distPath, 'index.html'));
  }
  next();
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));