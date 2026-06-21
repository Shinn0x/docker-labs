'use strict';

// Tiny zero-dependency health probe used by the Dockerfile's HEALTHCHECK.
// Exits 0 if the app answers 200 on /health, 1 otherwise. Keeping this in
// Node (instead of curl/wget) means the slim runtime image needs no extra
// packages installed.
const http = require('http');

const port = process.env.PORT || 3000;
const req = http.get({ host: '127.0.0.1', port, path: '/health', timeout: 2000 }, (res) => {
  process.exit(res.statusCode === 200 ? 0 : 1);
});

req.on('error', () => process.exit(1));
req.on('timeout', () => {
  req.destroy();
  process.exit(1);
});
