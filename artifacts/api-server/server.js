import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Path fix: Root directory mein 'dist' folder ko point karna
const distPath = path.resolve(__dirname, 'dist');

// Static files serve karo
app.use(express.static(distPath));

// Wildcard ('*') ki jagah ye middleware use karo
// Yeh sirf un requests ko handle karega jo kisi existing file ke liye nahi hain
app.use((req, res, next) => {
  if (!req.path.includes('.')) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    next();
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));