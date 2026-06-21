'use strict';

const { createApp } = require('./app');

const PORT = process.env.PORT || 3000;
const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`task-manager-api listening on :${PORT}`);
});

// Graceful shutdown so `docker stop` (SIGTERM) doesn't sever in-flight requests.
function shutdown(signal) {
  console.log(`received ${signal}, shutting down`);
  server.close(() => process.exit(0));
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
