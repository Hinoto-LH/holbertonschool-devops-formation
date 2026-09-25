const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

// DB_HOST is the *service name* declared in compose.yaml: Compose resolves it
// to the database container's IP on the internal network.
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

// Used by the healthcheck in compose.yaml: answers without touching the DB.
app.get('/health', (req, res) => {
  res.json({ service: 'api', status: 'ok' });
});

// Proves the API really reaches the database.
app.get('/api', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT now() AS db_time, version() AS db_version');
    res.json({
      service: 'api',
      status: 'ok',
      message: 'API reached the database',
      db_host: process.env.DB_HOST || 'db',
      db_time: rows[0].db_time,
      db_version: rows[0].db_version.split(',')[0],
    });
  } catch (err) {
    res.status(500).json({ service: 'api', status: 'error', message: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API listening on port ${PORT}`);
});
