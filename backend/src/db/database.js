import { Low } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'marketplace.json');

let _db = null;

export function getDb() {
  if (!_db) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const adapter = new JSONFileSync(DB_PATH);
    _db = new Low(adapter, { skills: [], nextId: 1 });
    _db.read();
  }
  return _db;
}

export function initDb() {
  const db = getDb();
  if (!db.data.skills) db.data.skills = [];
  if (!db.data.nextId) db.data.nextId = 1;
  db.write();
  console.log('Database initialized');
}
