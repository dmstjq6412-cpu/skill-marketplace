import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';

const router = express.Router();

const HARNESS_LAB_DIR = process.env.HARNESS_LAB_DIR
  ? path.resolve(process.env.HARNESS_LAB_DIR)
  : path.resolve(process.cwd(), '.harness-lab');

const LOGS_DIR = path.join(HARNESS_LAB_DIR, 'logs');
const BLUEPRINTS_DIR = path.join(HARNESS_LAB_DIR, 'blueprints');

function ensureDirs() {
  [HARNESS_LAB_DIR, LOGS_DIR, BLUEPRINTS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

// GET /api/harness/logs
router.get('/logs', (req, res) => {
  try {
    ensureDirs();
    const files = fs.existsSync(LOGS_DIR)
      ? fs.readdirSync(LOGS_DIR).filter(f => f.endsWith('.md')).sort().reverse()
      : [];

    const logs = files.map(f => {
      const date = f.replace('.md', '');
      const content = fs.readFileSync(path.join(LOGS_DIR, f), 'utf8');
      const summaryMatch = content.match(/## 작업 요약\n([\s\S]*?)(?=\n##|$)/);
      const summary = summaryMatch ? summaryMatch[1].trim().slice(0, 120) : '';
      return { date, summary };
    });

    res.json({ logs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read logs' });
  }
});

// GET /api/harness/logs/:date
router.get('/logs/:date', (req, res) => {
  try {
    const { date } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    const filePath = path.join(LOGS_DIR, `${date}.md`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Log not found' });
    }
    const content = fs.readFileSync(filePath, 'utf8');
    res.json({ date, content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read log' });
  }
});

// POST /api/harness/logs
router.post('/logs', (req, res) => {
  try {
    ensureDirs();
    const { date, content } = req.body;
    if (!date || !content) {
      return res.status(400).json({ error: 'date and content are required' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    const filePath = path.join(LOGS_DIR, `${date}.md`);
    fs.writeFileSync(filePath, content, 'utf8');
    res.status(201).json({ date, path: filePath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save log' });
  }
});

// GET /api/harness/blueprints
router.get('/blueprints', (req, res) => {
  try {
    ensureDirs();
    const files = fs.existsSync(BLUEPRINTS_DIR)
      ? fs.readdirSync(BLUEPRINTS_DIR).filter(f => f.endsWith('.json')).sort().reverse()
      : [];

    const blueprints = files.map(f => {
      const date = f.replace('.json', '');
      try {
        const data = JSON.parse(fs.readFileSync(path.join(BLUEPRINTS_DIR, f), 'utf8'));
        return { date, coverage: data.coverage, session_summary: data.session_summary };
      } catch {
        return { date };
      }
    });

    res.json({ blueprints });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read blueprints' });
  }
});

// GET /api/harness/blueprints/diff?from=YYYY-MM-DD&to=YYYY-MM-DD
// NOTE: must be registered BEFORE /blueprints/:date to avoid 'diff' matching as :date
router.get('/blueprints/diff', (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: 'from and to query params are required' });
    }

    const fromPath = path.join(BLUEPRINTS_DIR, `${from}.json`);
    const toPath = path.join(BLUEPRINTS_DIR, `${to}.json`);

    if (!fs.existsSync(fromPath)) return res.status(404).json({ error: `Blueprint for ${from} not found` });
    if (!fs.existsSync(toPath)) return res.status(404).json({ error: `Blueprint for ${to} not found` });

    const fromData = JSON.parse(fs.readFileSync(fromPath, 'utf8'));
    const toData = JSON.parse(fs.readFileSync(toPath, 'utf8'));

    const fromSkills = Object.fromEntries((fromData.skills || []).map(s => [s.name, s]));
    const toSkills = Object.fromEntries((toData.skills || []).map(s => [s.name, s]));

    const allNames = new Set([...Object.keys(fromSkills), ...Object.keys(toSkills)]);
    const changes = [];

    allNames.forEach(name => {
      const before = fromSkills[name];
      const after = toSkills[name];
      if (!before) {
        changes.push({ name, type: 'added', after });
      } else if (!after) {
        changes.push({ name, type: 'removed', before });
      } else if (before.status !== after.status || before.version !== after.version) {
        changes.push({ name, type: 'changed', before, after });
      }
    });

    res.json({
      from,
      to,
      coverage_before: fromData.coverage,
      coverage_after: toData.coverage,
      changes,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute diff' });
  }
});

// GET /api/harness/blueprints/:date
router.get('/blueprints/:date', (req, res) => {
  try {
    const { date } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    const filePath = path.join(BLUEPRINTS_DIR, `${date}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Blueprint not found' });
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read blueprint' });
  }
});

// POST /api/harness/blueprints
router.post('/blueprints', (req, res) => {
  try {
    ensureDirs();
    const blueprint = req.body;
    const { date } = blueprint;
    if (!date) return res.status(400).json({ error: 'date is required' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    const filePath = path.join(BLUEPRINTS_DIR, `${date}.json`);
    fs.writeFileSync(filePath, JSON.stringify(blueprint, null, 2), 'utf8');
    res.status(201).json({ date, path: filePath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save blueprint' });
  }
});

// HTML 파일 경로 맵 (HARNESS_LAB_DIR 기준으로 프로젝트 루트 도출)
const PROJECT_ROOT = path.dirname(HARNESS_LAB_DIR);
const HTML_FILES = {
  'todo-architecture': path.join(PROJECT_ROOT, 'enterprise-vibe-architecture.html'),
  'git-guard': path.join(os.homedir(), '.claude', 'skills', 'git-guard-claude', 'git-guard-flow.html'),
};

// GET /api/harness/html/:name
router.get('/html/:name', (req, res) => {
  const filePath = HTML_FILES[req.params.name];
  if (!filePath) {
    return res.status(404).json({ error: `Unknown html: ${req.params.name}` });
  }
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `File not found: ${filePath}` });
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(fs.readFileSync(filePath, 'utf8'));
});

export default router;
