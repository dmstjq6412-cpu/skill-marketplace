import express from 'express';
import { getPool } from '../db/database.js';

const router = express.Router();
const ALLOWED_VIZ = ['todo-architecture', 'git-guard'];

// GET /api/harness/logs
router.get('/logs', async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT date, substring(content from '## 작업 요약\n([\\s\\S]*?)(?=\n##|$)') AS summary
       FROM harness_logs ORDER BY date DESC`
    );
    const logs = rows.map(r => ({
      date: r.date,
      summary: (r.summary || '').trim().slice(0, 120),
    }));
    res.json({ logs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read logs' });
  }
});

// GET /api/harness/logs/:date
router.get('/logs/:date', async (req, res) => {
  try {
    const { date } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    const pool = getPool();
    const { rows } = await pool.query('SELECT date, content FROM harness_logs WHERE date = $1', [date]);
    if (rows.length === 0) return res.status(404).json({ error: 'Log not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read log' });
  }
});

// POST /api/harness/logs
router.post('/logs', async (req, res) => {
  try {
    const { date, content } = req.body;
    if (!date || !content) return res.status(400).json({ error: 'date and content are required' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    const pool = getPool();
    await pool.query(
      `INSERT INTO harness_logs (date, content) VALUES ($1, $2)
       ON CONFLICT (date) DO UPDATE SET content = $2, updated_at = NOW()`,
      [date, content]
    );
    res.status(201).json({ date });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save log' });
  }
});

// GET /api/harness/blueprints — 스킬 목록 (각 스킬의 최신 entry + 총 기록 수)
router.get('/blueprints', async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (skill)
        skill, date, change, reason, issues, articles,
        COUNT(*) OVER (PARTITION BY skill) AS entry_count
      FROM harness_blueprints
      ORDER BY skill, date DESC
    `);
    const skills = rows.map(r => ({
      skill: r.skill,
      latest: { date: r.date, change: r.change, reason: r.reason },
      entry_count: Number(r.entry_count),
    }));
    res.json({ skills });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read blueprints' });
  }
});

// GET /api/harness/blueprints/:skill — 특정 스킬의 전체 개선 히스토리
router.get('/blueprints/:skill', async (req, res) => {
  try {
    const { skill } = req.params;
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT date, change, reason, issues, articles FROM harness_blueprints WHERE skill = $1 ORDER BY date DESC',
      [skill]
    );
    if (rows.length === 0) return res.status(404).json({ error: `Blueprint for skill "${skill}" not found` });
    res.json({ skill, entries: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read blueprint' });
  }
});

// POST /api/harness/blueprints — 스킬 개선 entry 저장
// body: { skill, date, change, reason?, issues?, articles? }
router.post('/blueprints', async (req, res) => {
  try {
    const { skill, date, change, reason = '', issues = [], articles = [] } = req.body;
    if (!skill) return res.status(400).json({ error: 'skill is required' });
    if (!date) return res.status(400).json({ error: 'date is required' });
    if (!change) return res.status(400).json({ error: 'change is required' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    const pool = getPool();
    await pool.query(
      `INSERT INTO harness_blueprints (skill, date, change, reason, issues, articles)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (skill, date) DO UPDATE
         SET change = $3, reason = $4, issues = $5, articles = $6, updated_at = NOW()`,
      [skill, date, change, reason, JSON.stringify(issues), JSON.stringify(articles)]
    );
    res.status(201).json({ skill, date });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save blueprint' });
  }
});

// GET /api/harness/analysis
router.get('/analysis', async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT id, date, branch, started_at, ended_at, git, pr, quality FROM harness_analysis ORDER BY date DESC'
    );
    res.json({ reports: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read analysis reports' });
  }
});

// GET /api/harness/analysis/:id
router.get('/analysis/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM harness_analysis WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read analysis report' });
  }
});

// POST /api/harness/analysis
router.post('/analysis', async (req, res) => {
  try {
    const { date, branch, started_at, ended_at, git = {}, pr = null, quality = {} } = req.body;
    if (!date || !branch || !started_at || !ended_at) {
      return res.status(400).json({ error: 'date, branch, started_at, ended_at are required' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO harness_analysis (date, branch, started_at, ended_at, git, pr, quality)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (date) DO UPDATE
         SET branch = $2, started_at = $3, ended_at = $4, git = $5, pr = $6, quality = $7
       RETURNING id`,
      [date, branch, started_at, ended_at, JSON.stringify(git), pr ? JSON.stringify(pr) : null, JSON.stringify(quality)]
    );
    res.status(201).json({ id: rows[0].id, date });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save analysis report' });
  }
});

// GET /api/harness/html/:name
router.get('/html/:name', async (req, res) => {
  const { name } = req.params;
  if (!ALLOWED_VIZ.includes(name)) return res.status(404).json({ error: `Unknown html: ${name}` });
  try {
    const pool = getPool();
    const { rows } = await pool.query('SELECT content FROM harness_viz WHERE name = $1', [name]);
    if (rows.length === 0) return res.status(404).json({ error: `File not found: ${name}` });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(rows[0].content);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read html' });
  }
});

// POST /api/harness/html/:name
router.post('/html/:name', async (req, res) => {
  try {
    const { name } = req.params;
    if (!ALLOWED_VIZ.includes(name)) return res.status(400).json({ error: `Unknown viz name: ${name}. Allowed: ${ALLOWED_VIZ.join(', ')}` });
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });
    const pool = getPool();
    await pool.query(
      `INSERT INTO harness_viz (name, content) VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET content = $2, updated_at = NOW()`,
      [name, content]
    );
    res.status(201).json({ name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save html' });
  }
});

// GET /api/harness/references
router.get('/references', async (req, res) => {
  try {
    const { tag } = req.query;
    const pool = getPool();
    let query = 'SELECT id, title, url, summary, tags, created_at FROM harness_references';
    const params = [];
    if (tag) {
      query += ' WHERE tags @> $1';
      params.push(JSON.stringify([tag]));
    }
    query += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json({ references: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read references' });
  }
});

// POST /api/harness/references
router.post('/references', async (req, res) => {
  try {
    const { title, url, summary = '', tags = [], skills = [] } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    if (!url) return res.status(400).json({ error: 'url is required' });
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO harness_references (title, url, summary, tags, skills)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [title, url, summary, JSON.stringify(tags), JSON.stringify(skills)]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save reference' });
  }
});

// GET /api/harness/evaluations/:skill
router.get('/evaluations/:skill', async (req, res) => {
  try {
    const { skill } = req.params;
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT id, skill, date, article_title, article_url, gaps, suggestions, verdict, created_at FROM harness_evaluations WHERE skill = $1 ORDER BY date DESC',
      [skill]
    );
    res.json({ skill, evaluations: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read evaluations' });
  }
});

// POST /api/harness/evaluations
router.post('/evaluations', async (req, res) => {
  try {
    const { skill, date, article_title, article_url, gaps = [], suggestions = [], verdict = 'partial' } = req.body;
    if (!skill || !date || !article_title || !article_url) {
      return res.status(400).json({ error: 'skill, date, article_title, article_url are required' });
    }
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO harness_evaluations (skill, date, article_title, article_url, gaps, suggestions, verdict)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [skill, date, article_title, article_url, JSON.stringify(gaps), JSON.stringify(suggestions), verdict]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save evaluation' });
  }
});

// GET /api/harness/reviews/:skill
router.get('/reviews/:skill', async (req, res) => {
  try {
    const { skill } = req.params;
    const pool = getPool();
    const { rows } = await pool.query('SELECT skill, content, updated_at FROM harness_review_index WHERE skill = $1', [skill]);
    if (rows.length === 0) return res.status(404).json({ error: `No review index for skill "${skill}"` });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read review index' });
  }
});

// POST /api/harness/reviews/:skill — 인덱스 전체 덮어쓰기
router.post('/reviews/:skill', async (req, res) => {
  try {
    const { skill } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });
    const pool = getPool();
    await pool.query(
      `INSERT INTO harness_review_index (skill, content) VALUES ($1, $2)
       ON CONFLICT (skill) DO UPDATE SET content = $2, updated_at = NOW()`,
      [skill, content]
    );
    res.status(201).json({ skill });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save review index' });
  }
});

// DELETE /api/harness/references/:id
router.delete('/references/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    await pool.query('DELETE FROM harness_references WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete reference' });
  }
});

export default router;
