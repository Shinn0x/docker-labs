'use strict';

const { Pool } = require('pg');

// The connection details come entirely from environment variables, which
// Compose injects from the service definition / .env. Never hard-code these.
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'db',
  port: Number(process.env.POSTGRES_PORT || 5432),
  user: process.env.POSTGRES_USER || 'notes',
  password: process.env.POSTGRES_PASSWORD || 'notes',
  database: process.env.POSTGRES_DB || 'notes',
});

// Create the table on first boot. In a real app you'd use a migration tool,
// but this keeps the demo self-contained.
async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id        SERIAL PRIMARY KEY,
      title     TEXT NOT NULL,
      body      TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

module.exports = { pool, init };
