import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

let _pool = null;

export function getPool() {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }
  return _pool;
}

export async function initDb() {
  const pool = getPool();
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('Database initialized');
}

export async function initDbWithRetry({ retries = 1, delayMs = 3000 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await initDb();
      return;
    } catch (err) {
      if (attempt < retries) {
        console.warn(`[DB] Connection failed (${err.message}), retrying in ${delayMs / 1000}s...`);
        await new Promise(r => setTimeout(r, delayMs));
      } else {
        throw err;
      }
    }
  }
}
