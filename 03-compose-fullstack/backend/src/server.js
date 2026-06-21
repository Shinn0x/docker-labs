'use strict';

const express = require('express');
const { createClient } = require('redis');
const { pool, init } = require('./db');

const PORT = process.env.PORT || 4000;
const app = express();
app.use(express.json());

// --- Redis (used for a simple "page views" counter) -----------------------
const redis = createClient({ url: process.env.REDIS_URL || 'redis://cache:6379' });
redis.on('error', (err) => console.error('redis error', err));

// --- Health ----------------------------------------------------------------
// Reports the status of the service AND its dependencies, so Compose's
// healthcheck only goes green once the whole stack can actually serve traffic.
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    await redis.ping();
    res.json({ status: 'ok', db: 'up', cache: 'up' });
  } catch (err) {
    res.status(503).json({ status: 'degraded', error: String(err) });
  }
});

// --- Notes CRUD (Postgres) -------------------------------------------------
app.get('/api/notes', async (_req, res) => {
  const views = await redis.incr('notes:views');
  const { rows } = await pool.query('SELECT * FROM notes ORDER BY created_at DESC');
  res.json({ views, notes: rows });
});

app.post('/api/notes', async (req, res) => {
  const { title, body } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title is required' });
  const { rows } = await pool.query(
    'INSERT INTO notes (title, body) VALUES ($1, $2) RETURNING *',
    [title, body || '']
  );
  res.status(201).json(rows[0]);
});

app.delete('/api/notes/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM notes WHERE id = $1', [Number(req.params.id)]);
  if (!rowCount) return res.status(404).json({ error: 'note not found' });
  res.status(204).end();
});

// --- Startup: connect, migrate, then listen --------------------------------
async function start() {
  await redis.connect();
  await init();
  app.listen(PORT, () => console.log(`notes-backend listening on :${PORT}`));
}

start().catch((err) => {
  console.error('failed to start', err);
  process.exit(1);
});

process.on('SIGTERM', () => process.exit(0));
