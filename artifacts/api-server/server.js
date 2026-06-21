const express = require('express');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ➊  Serve every file inside /public (JS, CSS, images, etc.) */
app.use(express.static(path.join(__dirname, 'public')));

/* ➋  Catch-all so a SPA still loads on deep links */
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});