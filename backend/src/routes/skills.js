import express from 'express';
import AdmZip from 'adm-zip';
import { getPool } from '../db/database.js';
import upload from '../middleware/upload.js';

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
router.get('/', async (req, res) => {
  const pool = getPool();
  const { search = '', page = 1, limit = 20 } = req.query;
  const pageNum = Number(page);
  const limitNum = Number(limit);

  try {
    let query, params;
    if (search) {
      query = `SELECT id, name, version, author, description, file_type, downloads, created_at
               FROM skills WHERE name ILIKE $1 ORDER BY created_at DESC`;
      params = [`%${search}%`];
    } else {
      query = `SELECT id, name, version, author, description, file_type, downloads, created_at
               FROM skills ORDER BY created_at DESC`;
      params = [];
    }

    const { rows } = await pool.query(query, params);

    // Group by name, keep only the latest version per skill
    const grouped = {};
    rows.forEach(s => {
      if (!grouped[s.name] || compareVersions(s.version, grouped[s.name].version) > 0) {
        grouped[s.name] = s;
      }
    });
    const latest = Object.values(grouped).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const total = latest.length;
    const offset = (pageNum - 1) * limitNum;
    const paginated = latest.slice(offset, offset + limitNum);

    res.json({ skills: paginated, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/skills/:id
router.get('/:id', async (req, res) => {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `SELECT id, name, version, author, description, readme, file_type, downloads, created_at, updated_at
       FROM skills WHERE id = $1`,
      [Number(req.params.id)]
    );
    if (!rows.length) return res.status(404).json({ error: 'Skill not found' });

    const skill = rows[0];
    const { rows: versions } = await pool.query(
      `SELECT id, version, created_at, downloads FROM skills WHERE name = $1 ORDER BY created_at DESC`,
      [skill.name]
    );
    versions.sort((a, b) => compareVersions(b.version, a.version));

    res.json({ ...skill, versions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/skills
router.post('/', upload.single('skill_file'), async (req, res) => {
  const { name, version = '1.0.0', author, description = '' } = req.body;
  if (!name || !author || !req.file) {
    return res.status(400).json({ error: 'name, author, and skill_file are required' });
  }

  const isZip = req.file.originalname.endsWith('.zip');
  let readme = '';

  if (isZip) {
    const zip = new AdmZip(req.file.buffer);
    const entry = zip.getEntry('SKILL.md');
    if (!entry) return res.status(400).json({ error: 'SKILL.md not found in zip' });
    readme = entry.getData().toString('utf8');
  } else {
    readme = req.file.buffer.toString('utf8');
  }

  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `INSERT INTO skills (name, version, author, description, readme, filename, file_type, file_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [name, version, author, description, readme, req.file.originalname, isZip ? 'zip' : 'md', req.file.buffer]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/skills/:id
router.delete('/:id', async (req, res) => {
  const pool = getPool();
  try {
    const { rowCount } = await pool.query(`DELETE FROM skills WHERE id = $1`, [Number(req.params.id)]);
    if (!rowCount) return res.status(404).json({ error: 'Skill not found' });
    res.json({ message: 'Skill deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
