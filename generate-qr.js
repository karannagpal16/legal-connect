const QRCode = require('qrcode');
const ip = require('ip');

// Get local IP address
const localIp = ip.address();
const port = 8081;

// Create the Expo Go URL
const expoUrl = `exp://${localIp}:${port}`;

console.log(`\n📱 Expo Go QR Code`);
console.log(`================`);
console.log(`URL: ${expoUrl}\n`);

// Generate QR code in terminal
QRCode.toString(expoUrl, {
  type: 'terminal',
  width: 10
}, function(err, qrString) {
  if (err) {
    console.error('Error generating QR code:', err);
    process.exit(1);
  }
  console.log(qrString);
  console.log(`\n✅ Scan this QR code with Expo Go app`);
  console.log(`📍 Local IP: ${localIp}:${port}\n`);
});
