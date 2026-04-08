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

// GET /api/harness/blueprints
router.get('/blueprints', async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query('SELECT date, data FROM harness_blueprints ORDER BY date DESC');
    const blueprints = rows.map(r => ({
      date: r.date,
      coverage: r.data.coverage,
      session_summary: r.data.session_summary,
    }));
    res.json({ blueprints });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read blueprints' });
  }
});

// GET /api/harness/blueprints/diff?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/blueprints/diff', async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to query params are required' });
    const pool = getPool();
    const { rows } = await pool.query('SELECT date, data FROM harness_blueprints WHERE date IN ($1, $2)', [from, to]);
    const map = Object.fromEntries(rows.map(r => [r.date, r.data]));
    if (!map[from]) return res.status(404).json({ error: `Blueprint for ${from} not found` });
    if (!map[to]) return res.status(404).json({ error: `Blueprint for ${to} not found` });

    const fromSkills = Object.fromEntries((map[from].skills || []).map(s => [s.name, s]));
    const toSkills = Object.fromEntries((map[to].skills || []).map(s => [s.name, s]));
    const allNames = new Set([...Object.keys(fromSkills), ...Object.keys(toSkills)]);
    const changes = [];

    allNames.forEach(name => {
      const before = fromSkills[name];
      const after = toSkills[name];
      if (!before) changes.push({ name, type: 'added', after });
      else if (!after) changes.push({ name, type: 'removed', before });
      else if (before.status !== after.status || before.version !== after.version) changes.push({ name, type: 'changed', before, after });
    });

    res.json({ from, to, coverage_before: map[from].coverage, coverage_after: map[to].coverage, changes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute diff' });
  }
});

// GET /api/harness/blueprints/:date
router.get('/blueprints/:date', async (req, res) => {
  try {
    const { date } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    const pool = getPool();
    const { rows } = await pool.query('SELECT data FROM harness_blueprints WHERE date = $1', [date]);
    if (rows.length === 0) return res.status(404).json({ error: 'Blueprint not found' });
    res.json(rows[0].data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read blueprint' });
  }
});

// POST /api/harness/blueprints
router.post('/blueprints', async (req, res) => {
  try {
    const blueprint = req.body;
    const { date } = blueprint;
    if (!date) return res.status(400).json({ error: 'date is required' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    const pool = getPool();
    await pool.query(
      `INSERT INTO harness_blueprints (date, data) VALUES ($1, $2)
       ON CONFLICT (date) DO UPDATE SET data = $2, updated_at = NOW()`,
      [date, blueprint]
    );
    res.status(201).json({ date });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save blueprint' });
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

export default router;
