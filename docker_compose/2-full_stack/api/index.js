const express = require('express');
const { Pool } = require('pg');
const { createClient } = require('redis');

const PORT = 3000;
const DB_HOST = process.env.DB_HOST || 'db';
const CACHE_HOST = process.env.CACHE_HOST || 'cache';
const CACHE_KEY = 'report';
const CACHE_TTL = 30; // seconds

const pool = new Pool({
  host: DB_HOST,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

// Both hosts below are SERVICE NAMES from compose.yaml, resolved by Compose's
// internal DNS. No IP address is ever hardcoded.
const cache = createClient({ url: `redis://${CACHE_HOST}:6379` });
cache.on('error', (err) => console.error('redis error:', err.message));

const app = express();

app.get('/api/health', (req, res) => {
  res.json({ service: 'api', status: 'ok' });
});

// An expensive report: served from Redis when warm, computed by Postgres when
// cold. The response says which one answered and how long it took.
app.get('/api/report', async (req, res) => {
  const startedAt = Date.now();

  try {
    const cached = await cache.get(CACHE_KEY);
    if (cached) {
      return res.json({
        ...JSON.parse(cached),
        source: 'cache (redis)',
        elapsed_ms: Date.now() - startedAt,
      });
    }

    // pg_sleep simulates a report that is genuinely expensive to compute.
    await pool.query('SELECT pg_sleep(1)');
    const { rows } = await pool.query(
      'SELECT count(*)::int AS row_count, now() AS computed_at FROM generate_series(1, 100000)'
    );

    const payload = {
      row_count: rows[0].row_count,
      computed_at: rows[0].computed_at,
      cached_for_seconds: CACHE_TTL,
    };
    await cache.setEx(CACHE_KEY, CACHE_TTL, JSON.stringify(payload));

    res.json({
      ...payload,
      source: 'database (postgres)',
      elapsed_ms: Date.now() - startedAt,
    });
  } catch (err) {
    res.status(500).json({ service: 'api', status: 'error', message: err.message });
  }
});

// Drops the cached report, so the next call goes back to the database.
app.delete('/api/cache', async (req, res) => {
  const deleted = await cache.del(CACHE_KEY);
  res.json({ deleted_keys: deleted });
});

async function main() {
  await cache.connect();
  console.log(`connected to redis at ${CACHE_HOST}:6379`);
  app.listen(PORT, '0.0.0.0', () => console.log(`API listening on port ${PORT}`));
}

main();
