'use strict';

const express = require('express');
const { Pool } = require('pg');

const PORT = process.env.PORT || 5002;
// Other services are addressed by their Compose service name over the
// internal network — this is the heart of inter-service communication.
const AUTH_URL = process.env.AUTH_URL || 'http://auth-service:5001';
const CATALOG_URL = process.env.CATALOG_URL || 'http://catalog-service:8080';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'orders-db',
  port: Number(process.env.POSTGRES_PORT || 5432),
  user: process.env.POSTGRES_USER || 'orders',
  password: process.env.POSTGRES_PASSWORD || 'orders',
  database: process.env.POSTGRES_DB || 'orders',
});

const app = express();
app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', service: 'orders' });
  } catch (e) {
    res.status(503).json({ status: 'degraded' });
  }
});

// POST /orders { productId, quantity }  (requires Authorization: Bearer <token>)
app.post('/orders', async (req, res) => {
  try {
    // 1) Ask auth-service whether the caller's token is valid.
    const verify = await fetch(`${AUTH_URL}/verify`, {
      headers: { authorization: req.headers.authorization || '' },
    });
    if (!verify.ok) return res.status(401).json({ error: 'unauthorized' });
    const { username } = await verify.json();

    // 2) Ask catalog-service for the product (validates it exists + gets price).
    const { productId, quantity } = req.body || {};
    const prodRes = await fetch(`${CATALOG_URL}/products/${productId}`);
    if (prodRes.status === 404) return res.status(400).json({ error: 'unknown product' });
    if (!prodRes.ok) return res.status(502).json({ error: 'catalog unavailable' });
    const product = await prodRes.json();

    // 3) Persist the order in our own database.
    const qty = Math.max(1, Number(quantity) || 1);
    const total = (product.price * qty).toFixed(2);
    const { rows } = await pool.query(
      `INSERT INTO orders (username, product_id, product_name, quantity, total)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [username, product.id, product.name, qty, total]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'order failed' });
  }
});

app.get('/orders', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
  res.json(rows);
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id           SERIAL PRIMARY KEY,
      username     TEXT NOT NULL,
      product_id   INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity     INTEGER NOT NULL,
      total        NUMERIC(10,2) NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

(async () => {
  await init();
  app.listen(PORT, () => console.log(`order-service on :${PORT}`));
})().catch((err) => { console.error('startup failed', err); process.exit(1); });

process.on('SIGTERM', () => process.exit(0));
