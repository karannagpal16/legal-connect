import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __dirname = path.resolve(); // Yeh current working directory (root) lega

// Ab dist path ko absolute fix karo
const distPath = path.join(__dirname, 'dist');

app.use(express.static(distPath));

// Wildcard route (ab safe regex use kar rahe hain)
app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));