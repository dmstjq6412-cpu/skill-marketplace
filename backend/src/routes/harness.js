import express from 'express';
import { execSync } from 'child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { getPool } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const ALLOWED_VIZ = ['todo-architecture', 'git-guard'];

// @feature harness-log
// @desc 하네스 세션 로그 목록 조회 (날짜 역순, summary 120자 truncate)
// @flow DB 조회 → summary 파싱 → 목록 반환
// @table harness_logs
// @page /lab
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

// @feature harness-log
// @desc 특정 날짜 로그 전문 조회
// @flow 날짜 검증 → DB 조회 → 전문 반환
// @table harness_logs
// @page /lab
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

// @feature harness-log
// @desc 하네스 세션 로그 저장 (date 기준 upsert)
// @flow 입력 검증 → DB upsert → 날짜 반환
// @table harness_logs
// @page /lab
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

// @feature harness-blueprint
// @desc 스킬 개선 히스토리 목록 조회 (각 스킬의 최신 entry + 총 기록 수)
// @flow DB 스킬별 최신 blueprint 조회 → 목록 반환
// @table harness_blueprints
// @page /lab
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

// @feature harness-blueprint
// @desc 특정 스킬의 전체 개선 이력 조회
// @flow DB 전체 이력 조회 → 반환
// @table harness_blueprints
// @page /lab
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

// @feature harness-blueprint
// @desc 스킬 개선 entry 저장 (skill+date 기준 upsert)
// @flow 입력 검증 → DB upsert → 반환
// @table harness_blueprints
// @page /lab
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

// @feature harness-analysis
// @desc 시범운행 분석 리포트 목록 조회 (날짜 역순)
// @flow DB 분석 리포트 목록 → 날짜 역순 반환
// @table harness_analysis
// @page /lab
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

// @feature harness-analysis
// @desc 특정 분석 리포트 조회
// @flow DB 단일 리포트 조회 → 반환
// @table harness_analysis
// @page /lab
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

// @feature harness-analysis
// @desc 시범운행 분석 리포트 저장 (date 기준 upsert)
// @flow 입력 검증 → DB upsert → id 반환
// @table harness_analysis
// @page /lab
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

// @feature harness-viz
// @desc 시각화 HTML 파일 조회 (허용 목록 내 이름만)
// @flow 허용 목록 검증 → DB HTML 조회 → HTML 응답
// @table harness_viz
// @page /lab
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

// @feature harness-viz
// @desc 시각화 HTML 저장 (name 기준 upsert)
// @flow 허용 목록 검증 → DB upsert → name 반환
// @table harness_viz
// @page /lab
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

// @feature harness-references
// @desc 아티클 레퍼런스 목록 조회 (평가 이력 포함, tag 필터 가능)
// @flow tag 필터 → DB 조회(evaluations JOIN) → 목록 반환
// @table harness_references,harness_evaluations
// @page /lab
router.get('/references', async (req, res) => {
  try {
    const { tag } = req.query;
    const pool = getPool();
    const params = [];
    let where = '';
    if (tag) {
      where = ' WHERE r.tags @> $1';
      params.push(JSON.stringify([tag]));
    }
    const query = `
      SELECT r.id, r.title, r.url, r.summary, r.tags, r.created_at,
             COALESCE(
               json_agg(
                 json_build_object(
                   'skill', e.skill,
                   'verdict', e.verdict,
                   'gaps', e.gaps,
                   'suggestions', e.suggestions,
                   'date', e.date
                 ) ORDER BY e.date DESC
               ) FILTER (WHERE e.id IS NOT NULL),
               '[]'
             ) AS evaluations
      FROM harness_references r
      LEFT JOIN harness_evaluations e ON e.article_url = r.url
      ${where}
      GROUP BY r.id
      ORDER BY r.created_at DESC`;
    const { rows } = await pool.query(query, params);
    res.json({ references: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read references' });
  }
});

// @feature harness-references
// @desc 아티클 레퍼런스 저장 (url 기준 upsert)
// @flow 입력 검증 → DB upsert → id 반환
// @table harness_references
// @page /lab
router.post('/references', async (req, res) => {
  try {
    const { title, url, summary = '', tags = [], skills = [] } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    if (!url) return res.status(400).json({ error: 'url is required' });
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO harness_references (title, url, summary, tags, skills)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (url) DO UPDATE
         SET title = EXCLUDED.title, summary = EXCLUDED.summary,
             tags = EXCLUDED.tags, skills = EXCLUDED.skills
       RETURNING id`,
      [title, url, summary, JSON.stringify(tags), JSON.stringify(skills)]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save reference' });
  }
});

// @feature harness-evaluations
// @desc 전체 평가 이력 조회 (skill 파라미터로 필터 가능)
// @flow skill 필터 → DB 조회 → 목록 반환
// @table harness_evaluations
// @page /lab
router.get('/evaluations', async (req, res) => {
  try {
    const { skill } = req.query;
    const pool = getPool();
    const params = [];
    let where = '';
    if (skill) {
      where = ' WHERE skill = $1';
      params.push(skill);
    }
    const { rows } = await pool.query(
      `SELECT id, skill, date, article_title, article_url, gaps, suggestions, verdict, created_at FROM harness_evaluations${where} ORDER BY date DESC`,
      params
    );
    res.json({ evaluations: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read evaluations' });
  }
});

// @feature harness-evaluations
// @desc 특정 스킬의 평가 이력 조회
// @flow DB 스킬별 평가 조회 → 반환
// @table harness_evaluations
// @page /lab
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

// @feature harness-evaluations
// @desc 스킬 평가 저장
// @flow 입력 검증 → DB INSERT → id 반환
// @table harness_evaluations
// @page /lab
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

// @feature harness-evaluations
// @desc 평가 gap_decisions 업데이트
// @flow gap_decisions 검증 → DB UPDATE → 결과 반환
// @table harness_evaluations
// @page /lab
router.patch('/evaluations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { gap_decisions } = req.body;
    if (!gap_decisions) {
      return res.status(400).json({ error: 'gap_decisions is required' });
    }
    const pool = getPool();
    const { rows } = await pool.query(
      'UPDATE harness_evaluations SET gap_decisions = $1 WHERE id = $2 RETURNING id, gap_decisions',
      [JSON.stringify(gap_decisions), id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Evaluation not found' });
    res.json({ id: rows[0].id, gap_decisions: rows[0].gap_decisions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update evaluation' });
  }
});

// @feature harness-reviews
// @desc 스킬 리뷰 인덱스 조회
// @flow DB 리뷰 인덱스 조회 → 반환
// @table harness_review_index
// @page /lab
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

// @feature harness-reviews
// @desc 스킬 리뷰 인덱스 전체 덮어쓰기
// @flow content 검증 → DB upsert → skill 반환
// @table harness_review_index
// @page /lab
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

// @feature harness-evaluations
// @desc 평가 삭제 (인증 필요)
// @flow 인증 확인 → DB DELETE → ok 반환
// @table harness_evaluations
// @page /lab
router.delete('/evaluations/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const { rows } = await pool.query('DELETE FROM harness_evaluations WHERE id = $1 RETURNING id', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete evaluation' });
  }
});

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

// @feature system-map
// @desc 시스템 맵 JSON 런타임 생성·반환 (라우트 파싱 + @feature 기능 지도 포함)
// @flow generate-system-map.js 실행 → domains + features JSON 반환
// @req feature-map-view
// @page /system-structure
router.get('/system-map', authenticate, (req, res) => {
  try {
    const output = execSync('node scripts/generate-system-map.js --json', {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      timeout: 10000,
    });
    res.json(JSON.parse(output));
  } catch (err) {
    console.error('[system-map] execSync failed:', err.message);
    res.status(500).json({ error: 'Failed to generate system map' });
  }
});

// @feature system-map
// @desc 하네스 의도 문서(docs/harness-intent.md) 반환
// @flow 파일 읽기 → { content } 반환, 파일 없으면 { content: '' }
// @page /lab
router.get('/intent', authenticate, (req, res) => {
  try {
    const intentPath = path.join(PROJECT_ROOT, 'docs', 'harness-intent.md');
    const content = readFileSync(intentPath, 'utf8');
    res.json({ content });
  } catch {
    res.json({ content: '' });
  }
});

// @feature harness-references
// @desc 아티클 레퍼런스 삭제
// @flow DB DELETE → ok 반환
// @table harness_references
// @page /lab
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
