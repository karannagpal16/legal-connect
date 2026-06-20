const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// 1. Debug Log: Let's see exactly what folders exist on Render right now
console.log("Current Directory (__dirname):", __dirname);
try {
  const files = fs.readdirSync(__dirname);
  console.log("Files in root:", files);
  
  // If artifacts folder exists, log what's inside it
  if (files.includes('artifacts')) {
    console.log("Inside artifacts:", fs.readdirSync(path.join(__dirname, 'artifacts')));
    console.log("Inside law-firm:", fs.readdirSync(path.join(__dirname, 'artifacts', 'law-firm')));
  }
} catch (err) {
  console.log("Error reading directory structure:", err.message);
}

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
  // 2. Dynamic Path Resolution
  let publicPath = path.join(__dirname, 'dist', 'public');

  // Check common nested locations if the root one doesn't exist
  if (!fs.existsSync(path.join(publicPath, 'index.html'))) {
    publicPath = path.join(__dirname, 'artifacts', 'law-firm', 'dist', 'public');
  }
  if (!fs.existsSync(path.join(publicPath, 'index.html'))) {
    publicPath = path.join(__dirname, 'law-firm', 'dist', 'public');
  }

  // 3. Fallback to a basic welcome message if the build folder literally doesn't exist anywhere
  if (!fs.existsSync(path.join(publicPath, 'index.html'))) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(`
      <html>
        <body style="font-family:sans-serif; text-align:center; padding-top:50px; background:#1e1e2e; color:white;">
          <h1>Server is Live! 🚀</h1>
          <p>The backend is working perfectly, but the frontend build folder could not be located on the server.</p>
          <p>Current path checked: <code>${publicPath}</code></p>
        </body>
      </html>
    `);
  }

  // 4. Standard static asset streaming logic
  let filePath = req.url === '/' 
    ? path.join(publicPath, 'index.html')
    : path.join(publicPath, req.url);

  const extname = String(path.extname(filePath)).toLowerCase();
  let contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // SPA Fallback: Serve index.html for unknown routes
        fs.readFile(path.join(publicPath, 'index.html'), (err, fallbackContent) => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(fallbackContent, 'utf-8');
        });
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server process initiated on port ${PORT}`);
});