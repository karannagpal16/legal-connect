import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.resolve(); 
const app = express();
const distPath = path.join(__dirname, 'dist');

app.use(express.static(distPath));

// Wildcard ('*') hata diya hai, ab sirf static files aur fallback use kar rahe hain
app.use((req, res, next) => {
  if (!req.path.includes('.')) {
    return res.sendFile(path.join(distPath, 'index.html'));
  }
  next();
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));