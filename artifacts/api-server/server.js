import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Ye Render ke liye relative path fix hai
const distPath = path.resolve(__dirname, 'dist');

// Static files serve karo
app.use(express.static(distPath));

// Wildcard route ko handle karne ka safe middleware
app.use((req, res, next) => {
  if (!req.path.includes('.')) {
    return res.sendFile(path.join(distPath, 'index.html'));
  }
  next();
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});