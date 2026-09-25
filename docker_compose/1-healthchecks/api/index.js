const express = require('express');
const { Client } = require('pg');

const PORT = 3000;
const DB_HOST = process.env.DB_HOST || 'db';

const ts = () => new Date().toISOString();

async function main() {
  console.log(`[${ts()}] API starting up`);
  console.log(`[${ts()}] connecting to database at ${DB_HOST}:5432 ...`);

  const client = new Client({
    host: DB_HOST,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  });

  // On purpose: ONE attempt, no retry loop. The point of this task is to show
  // that ordering is the orchestrator's job, not something the app should have
  // to work around. Without a healthcheck gate, this is where the API dies.
  try {
    await client.connect();
  } catch (err) {
    console.error(`[${ts()}] FATAL: database not reachable — ${err.message}`);
    process.exit(1);
  }

  const { rows } = await client.query('SELECT now() AS db_time');
  console.log(`[${ts()}] connected — database answered at ${rows[0].db_time.toISOString()}`);

  const app = express();
  app.get('/', async (req, res) => {
    const { rows } = await client.query('SELECT now() AS db_time');
    res.json({ service: 'api', status: 'ok', db_host: DB_HOST, db_time: rows[0].db_time });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[${ts()}] API listening on port ${PORT}`);
  });
}

main();
