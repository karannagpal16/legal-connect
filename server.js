const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Render ke direct environment variable target aur standard dist locations dono ko binding di hai
const PUBLIC_DIRS = [
  path.join(__dirname, 'dist'),
  path.join(__dirname, 'dist', 'public'),
  path.join(__dirname, 'artifacts', 'law-firm', 'dist', 'public'),
  path.join(__dirname, 'public')
];

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Pure target configurations check loop
  let resolvedDir = PUBLIC_DIRS.find(dir => fs.existsSync(path.join(dir, 'index.html')));

  if (!resolvedDir) {
    // Agar compiler ne custom deep subfolder banaya ho, then find index.html dynamically
    const findIndexHtml = (base) => {
      const files = fs.readdirSync(base, { withFileTypes: true });
      for (const file of files) {
        if (file.isDirectory() && file.name !== 'node_modules') {
          const resPath = path.join(base, file.name);
          if (fs.existsSync(path.join(resPath, 'index.html'))) return resPath;
          const deep = findIndexHtml(resPath);
          if (deep) return deep;
        }
      }
      return null;
    };
    try { resolvedDir = findIndexHtml(__dirname); } catch(e) {}
  }

  // Fallback direct text routing if it physically fails to pull files
  if (!resolvedDir) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end('<h1>Legal Connect Server Active</h1><p>Frontend production bundle asset directory route fallback activated.</p>');
  }

  let targetFile = req.url === '/' ? 'index.html' : req.url;
  let filePath = path.join(resolvedDir, targetFile);

  // If request contains sub-routes (SPA routing fallback)
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(resolvedDir, 'index.html');
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(500);
      res.end(`Internal Server Error: ${error.code}`);
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server executing successfully on port ${PORT}`);
});