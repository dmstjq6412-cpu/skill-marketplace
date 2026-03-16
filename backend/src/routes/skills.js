import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../db/database.js';
import upload from '../middleware/upload.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

function compareVersions(a, b) {
  const pa = (a || '0').split('.').map(Number);
  const pb = (b || '0').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

// GET /api/skills
router.get('/', (req, res) => {
  const db = getDb();
  const { search = '', page = 1, limit = 20 } = req.query;
  const pageNum = Number(page);
  const limitNum = Number(limit);

  let skills = db.data.skills;

  if (search) {
    const q = search.toLowerCase();
    skills = skills.filter(s => s.name.toLowerCase().includes(q));
  }

  // Group by name, keep only the latest version per skill
  const grouped = {};
  skills.forEach(s => {
    if (!grouped[s.name] || compareVersions(s.version, grouped[s.name].version) > 0) {
      grouped[s.name] = s;
    }
  });
  let latest = Object.values(grouped).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const total = latest.length;
  const offset = (pageNum - 1) * limitNum;
  const paginated = latest.slice(offset, offset + limitNum).map(s => ({
    id: s.id,
    name: s.name,
    version: s.version,
    author: s.author,
    description: s.description,
    downloads: s.downloads,
    created_at: s.created_at,
  }));

  res.json({ skills: paginated, total, page: pageNum, limit: limitNum });
});

// GET /api/skills/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const skill = db.data.skills.find(s => s.id === Number(req.params.id));
  if (!skill) return res.status(404).json({ error: 'Skill not found' });

  const versions = db.data.skills
    .filter(s => s.name === skill.name)
    .map(s => ({ id: s.id, version: s.version, created_at: s.created_at, downloads: s.downloads }))
    .sort((a, b) => compareVersions(b.version, a.version));

  res.json({ ...skill, versions });
});

// POST /api/skills
router.post('/', upload.single('skill_file'), (req, res) => {
  const { name, version = '1.0.0', author, description = '' } = req.body;
  if (!name || !author || !req.file) {
    return res.status(400).json({ error: 'name, author, and skill_file are required' });
  }

  const db = getDb();
  const readme = fs.readFileSync(req.file.path, 'utf8');
  const now = new Date().toISOString();
  const id = db.data.nextId;

  db.data.skills.push({
    id,
    name,
    version,
    author,
    description,
    readme,
    filename: req.file.filename,
    downloads: 0,
    created_at: now,
    updated_at: now,
  });
  db.data.nextId += 1;
  db.write();

  res.status(201).json({ id });
});

// DELETE /api/skills/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const idx = db.data.skills.findIndex(s => s.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Skill not found' });

  const skill = db.data.skills[idx];
  const filePath = path.join(__dirname, '../storage/skills', skill.filename);
  try { fs.unlinkSync(filePath); } catch (_) {}

  db.data.skills.splice(idx, 1);
  db.write();

  res.json({ message: 'Skill deleted' });
});

export default router;
