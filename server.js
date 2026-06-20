const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Helper to determine the correct content types for frontend assets
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
  // Safe routing: default root requests directly to index.html
  let filePath = req.url === '/' 
    ? path.join(__dirname, 'artifacts', 'law-firm', 'dist', 'public', 'index.html')
    : path.join(__dirname, 'artifacts', 'law-firm', 'dist', 'public', req.url);

  const extname = String(path.extname(filePath)).toLowerCase();
  let contentType = MIME_TYPES[extname] || 'application/octet-stream';

  // Read and stream the file from the production folder structure
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // If an asset is missing or handled by frontend routing, fallback to index.html
        fs.readFile(path.join(__dirname, 'artifacts', 'law-firm', 'dist', 'public', 'index.html'), (err, fallbackContent) => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(fallbackContent, 'utf-8');
        });
      } else {
        // Standard server error fallback
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      // Stream the compiled asset back safely
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running smoothly on port ${PORT}`);
});