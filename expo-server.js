const http = require('http');
const ip = require('ip');
const fs = require('fs');
const path = require('path');

const localIp = ip.address();
const PORT = 8081;

// Serve the Expo manifest
const manifest = {
  "id": "@anonymous/legal-connect",
  "projects": {
    "@workspace/law-firm": {
      "name": "Legal Connect",
      "slug": "legal-connect",
      "version": "1.0.0",
      "orientation": "portrait",
      "scheme": "legalconnect",
      "platforms": ["ios", "android", "web"],
      "sdkVersion": "51.0.0",
      "runtimeVersion": "1.0.0",
      "createdAt": new Date().toISOString(),
      "isVerified": false,
      "owner": "anonymous",
      "privacy": "unlisted"
    }
  },
  "bundler": "metro",
  "cliVersion": "5.10.0",
  "cliStartCommand": "expo start"
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Serve manifest
  if (pathname === '/' || pathname === '/manifest.json' || pathname === '/index.json') {
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(manifest, null, 2));
    return;
  }

  // Serve metadata
  if (pathname === '/metadata') {
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({
      "sdkVersion": "51.0.0",
      "name": "legal-connect",
      "slug": "legal-connect"
    }, null, 2));
    return;
  }

  // Serve development HTML
  if (pathname === '/dev' || pathname === '/dev.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Legal Connect - Expo Go</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%);
              color: white;
              padding: 20px;
            }
            .container {
              text-align: center;
              max-width: 500px;
            }
            h1 {
              font-size: 2.5em;
              margin-bottom: 20px;
            }
            .status {
              font-size: 1.2em;
              opacity: 0.8;
              margin: 20px 0;
              padding: 20px;
              background: rgba(76, 175, 80, 0.1);
              border-radius: 10px;
              border: 1px solid rgba(76, 175, 80, 0.3);
            }
            .info {
              background: rgba(255, 255, 255, 0.1);
              padding: 20px;
              border-radius: 10px;
              margin-top: 20px;
              font-size: 0.9em;
              text-align: left;
            }
            .info p {
              margin: 10px 0;
            }
            .url {
              font-family: monospace;
              background: rgba(0, 0, 0, 0.3);
              padding: 10px;
              border-radius: 5px;
              margin: 10px 0;
              word-break: break-all;
            }
            .error {
              color: #ff6b6b;
              margin-top: 20px;
              padding: 15px;
              background: rgba(255, 107, 107, 0.1);
              border-radius: 5px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📱 Legal Connect</h1>
            <div class="status">
              ✅ Expo Server Running
            </div>
            <div class="info">
              <p><strong>Server URL:</strong></p>
              <div class="url">exp://${localIp}:${PORT}</div>
              <p><strong>Status:</strong> Ready for Expo Go connection</p>
              <p><strong>Manifest:</strong> Available at /manifest.json</p>
              <p><strong>Note:</strong> This is a web app. For full functionality, use a web browser or ensure Expo SDK version 51+ is installed.</p>
            </div>
            <div class="error">
              ⚠️ This is a React Web app, not a React Native app. Expo Go has limited support for web-only apps. Consider using:
              <ul style="margin-top: 10px; text-align: left;">
                <li>Web browser at <code>http://${localIp}:8080</code></li>
                <li>Or converting to React Native for full mobile support</li>
              </ul>
            </div>
          </div>
        </body>
      </html>
    `);
    return;
  }

  // Default 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
📱 Expo Development Server
===========================
✅ Server running on port ${PORT}
📍 Expo URL: exp://${localIp}:${PORT}
🌐 Dev Page: http://${localIp}:${PORT}/dev
📦 Manifest: http://${localIp}:${PORT}/manifest.json

🔍 To connect:
   1. Open Expo Go app on your mobile device
   2. Scan the QR code or paste: exp://${localIp}:${PORT}

⚠️  Note: This is a React Web application. For best results:
    - Use a web browser instead
    - Or add React Native support to the app
  `);
});
