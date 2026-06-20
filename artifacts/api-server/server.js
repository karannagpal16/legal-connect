import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Kyunki humne Root Directory 'artifacts/api-server' set ki hai,
// __dirname yahan point karega, toh dist wahin hoga:
const distPath = path.join(__dirname, 'dist'); 

app.use(express.static(distPath));

// Fallback: Agar koi file na mile, toh index.html bhejo
app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));