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

// GET /api/skills/by-name/:name
router.get('/by-name/:name', async (req, res) => {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `SELECT id, name, version, author, description, readme, file_type, downloads, created_at, updated_at
       FROM skills WHERE name = $1 ORDER BY created_at DESC`,
      [req.params.name]
    );
    if (!rows.length) return res.status(404).json({ error: 'Skill not found' });

    // 가장 최신 버전 반환
    rows.sort((a, b) => compareVersions(b.version, a.version));
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
    const [versionsResult, filesResult] = await Promise.all([
      pool.query(
        `SELECT id, version, created_at, downloads FROM skills WHERE name = $1 ORDER BY created_at DESC`,
        [skill.name]
      ),
      pool.query(
        `SELECT id, file_path FROM skill_files WHERE skill_id = $1 ORDER BY file_path ASC`,
        [skill.id]
      ),
    ]);

    const versions = versionsResult.rows.sort((a, b) => compareVersions(b.version, a.version));
    res.json({ ...skill, versions, ref_files: filesResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/skills/:id/files/:fileId
router.get('/:id/files/:fileId', async (req, res) => {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `SELECT file_path, file_data FROM skill_files WHERE id = $1 AND skill_id = $2`,
      [Number(req.params.fileId), Number(req.params.id)]
    );
    if (!rows.length) return res.status(404).json({ error: 'File not found' });
    res.json({ file_path: rows[0].file_path, content: rows[0].file_data });
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

  let refFiles = []; // { path, content }

  if (isZip) {
    const zip = new AdmZip(req.file.buffer);
    const entry = zip.getEntry('SKILL.md');
    if (!entry) return res.status(400).json({ error: 'SKILL.md not found in zip' });
    readme = entry.getData().toString('utf8');

    zip.getEntries().forEach(e => {
      if (e.isDirectory) return;
      if (e.entryName === 'SKILL.md') return;
      if (e.entryName.toLowerCase().endsWith('.md')) {
        refFiles.push({ path: e.entryName, content: e.getData().toString('utf8') });
      }
    });
  } else {
    readme = req.file.buffer.toString('utf8');
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO skills (name, version, author, description, readme, filename, file_type, file_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [name, version, author, description, readme, req.file.originalname, isZip ? 'zip' : 'md', req.file.buffer]
    );
    const skillId = rows[0].id;

    for (const f of refFiles) {
      await client.query(
        `INSERT INTO skill_files (skill_id, file_path, file_data) VALUES ($1, $2, $3)`,
        [skillId, f.path, f.content]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ id: skillId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    client.release();
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
