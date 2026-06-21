'use strict';

const crypto = require('crypto');
const express = require('express');
const { createClient } = require('redis');

const PORT = process.env.PORT || 5001;
const TOKEN_TTL_SECONDS = 3600;

// Demo users only — in a real service these live in a database with hashed
// passwords. The point of this project is the container topology, not auth.
const USERS = { alice: 'password123', bob: 'hunter2' };

const app = express();
app.use(express.json());

const redis = createClient({ url: process.env.REDIS_URL || 'redis://cache:6379' });
redis.on('error', (err) => console.error('redis error', err));

app.get('/health', async (_req, res) => {
  try {
    await redis.ping();
    res.json({ status: 'ok', service: 'auth' });
  } catch (e) {
    res.status(503).json({ status: 'degraded' });
  }
});

// POST /login -> issue an opaque token stored in Redis with a TTL.
app.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (USERS[username] !== password) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  await redis.set(`token:${token}`, username, { EX: TOKEN_TTL_SECONDS });
  res.json({ token, expiresIn: TOKEN_TTL_SECONDS });
});

// GET /verify -> used by OTHER services to validate a bearer token.
app.get('/verify', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ valid: false });
  const username = await redis.get(`token:${token}`);
  if (!username) return res.status(401).json({ valid: false });
  res.json({ valid: true, username });
});

(async () => {
  await redis.connect();
  app.listen(PORT, () => console.log(`auth-service on :${PORT}`));
})();

process.on('SIGTERM', () => process.exit(0));
