import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

const mockPool = vi.hoisted(() => ({ query: vi.fn() }));
const mockExecSync = vi.hoisted(() => vi.fn());
vi.mock('../../src/db/database.js', () => ({ getPool: () => mockPool }));
vi.mock('../../src/middleware/auth.js', () => ({ authenticate: (req, res, next) => next() }));
vi.mock('child_process', () => ({ execSync: mockExecSync }));

const { default: harnessRouter } = await import('../../src/routes/harness.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', harnessRouter);
  return app;
}

const LOG_CONTENT = `# Harness Lab — 2026-04-08\n\n## 작업 요약\nharness-lab 기능 구현\n\n## 개선 포인트\n테스트 누락 발견`;
const BLUEPRINT_BODY = { skill: 'tdd-guard-claude', date: '2026-04-08', change: '초기 생성', reason: '테스트 자동화' };

// ============================================================
// GET /logs
// ============================================================
describe('GET /logs', () => {
  beforeEach(() => mockPool.query.mockReset());

  it('로그 목록을 반환', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ date: '2026-04-08', summary: 'harness-lab 기능 구현' }],
    });
    const res = await request(buildApp()).get('/logs');
    expect(res.status).toBe(200);
    expect(res.body.logs[0]).toMatchObject({ date: '2026-04-08', summary: expect.any(String) });
  });

  it('로그 없으면 빈 배열 반환', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(buildApp()).get('/logs');
    expect(res.status).toBe(200);
    expect(res.body.logs).toEqual([]);
  });

  it('summary는 120자 이하로 잘림', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ date: '2026-04-08', summary: 'a'.repeat(200) }],
    });
    const res = await request(buildApp()).get('/logs');
    expect(res.body.logs[0].summary.length).toBeLessThanOrEqual(120);
  });
});

// ============================================================
// GET /logs/:date
// ============================================================
describe('GET /logs/:date', () => {
  beforeEach(() => mockPool.query.mockReset());

  it('존재하는 날짜 로그를 반환', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ date: '2026-04-08', content: LOG_CONTENT }] });
    const res = await request(buildApp()).get('/logs/2026-04-08');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ date: '2026-04-08', content: LOG_CONTENT });
  });

  it('존재하지 않는 날짜는 404 반환', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(buildApp()).get('/logs/2026-04-08');
    expect(res.status).toBe(404);
  });

  it('잘못된 날짜 형식은 400 반환', async () => {
    const res = await request(buildApp()).get('/logs/invalid-date');
    expect(res.status).toBe(400);
  });

  it('YYYY-MM-DD 형식이 아닌 날짜는 400 반환', async () => {
    const res = await request(buildApp()).get('/logs/2026-4-8');
    expect(res.status).toBe(400);
  });
});

// ============================================================
// POST /logs
// ============================================================
describe('POST /logs', () => {
  beforeEach(() => mockPool.query.mockReset());

  it('유효한 date+content로 저장 성공', async () => {
    mockPool.query.mockResolvedValueOnce({});
    const res = await request(buildApp()).post('/logs').send({ date: '2026-04-08', content: LOG_CONTENT });
    expect(res.status).toBe(201);
    expect(res.body.date).toBe('2026-04-08');
    expect(mockPool.query).toHaveBeenCalledOnce();
  });

  it('date 없으면 400 반환', async () => {
    const res = await request(buildApp()).post('/logs').send({ content: LOG_CONTENT });
    expect(res.status).toBe(400);
  });

  it('content 없으면 400 반환', async () => {
    const res = await request(buildApp()).post('/logs').send({ date: '2026-04-08' });
    expect(res.status).toBe(400);
  });

  it('잘못된 날짜 형식은 400 반환', async () => {
    const res = await request(buildApp()).post('/logs').send({ date: '20260408', content: LOG_CONTENT });
    expect(res.status).toBe(400);
  });
});

// ============================================================
// GET /blueprints — 스킬별 최신 entry 목록
// ============================================================
describe('GET /blueprints', () => {
  beforeEach(() => mockPool.query.mockReset());

  it('스킬 목록과 최신 entry를 반환', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ skill: 'tdd-guard-claude', date: '2026-04-08', change: '초기 생성', reason: '', entry_count: '2' }],
    });
    const res = await request(buildApp()).get('/blueprints');
    expect(res.status).toBe(200);
    expect(res.body.skills[0].skill).toBe('tdd-guard-claude');
    expect(res.body.skills[0].entry_count).toBe(2);
    expect(res.body.skills[0].latest).toMatchObject({ date: '2026-04-08', change: '초기 생성' });
  });

  it('blueprint 없으면 빈 배열 반환', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(buildApp()).get('/blueprints');
    expect(res.status).toBe(200);
    expect(res.body.skills).toEqual([]);
  });
});

// ============================================================
// GET /blueprints/:skill — 특정 스킬의 전체 히스토리
// ============================================================
describe('GET /blueprints/:skill', () => {
  beforeEach(() => mockPool.query.mockReset());

  it('존재하는 스킬의 전체 히스토리 반환', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [
        { date: '2026-04-08', change: '초기 생성', reason: '', issues: [], articles: [] },
        { date: '2026-04-09', change: '개선', reason: '...', issues: [], articles: [] },
      ],
    });
    const res = await request(buildApp()).get('/blueprints/tdd-guard-claude');
    expect(res.status).toBe(200);
    expect(res.body.skill).toBe('tdd-guard-claude');
    expect(res.body.entries).toHaveLength(2);
  });

  it('존재하지 않는 스킬은 404 반환', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(buildApp()).get('/blueprints/unknown-skill');
    expect(res.status).toBe(404);
  });
});

// ============================================================
// POST /blueprints
// ============================================================
describe('POST /blueprints', () => {
  beforeEach(() => mockPool.query.mockReset());

  it('유효한 blueprint 저장 성공', async () => {
    mockPool.query.mockResolvedValueOnce({});
    const res = await request(buildApp()).post('/blueprints').send(BLUEPRINT_BODY);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ skill: 'tdd-guard-claude', date: '2026-04-08' });
    expect(mockPool.query).toHaveBeenCalledOnce();
  });

  it('skill 없으면 400 반환', async () => {
    const { skill: _, ...withoutSkill } = BLUEPRINT_BODY;
    const res = await request(buildApp()).post('/blueprints').send(withoutSkill);
    expect(res.status).toBe(400);
  });

  it('date 없으면 400 반환', async () => {
    const { date: _, ...withoutDate } = BLUEPRINT_BODY;
    const res = await request(buildApp()).post('/blueprints').send(withoutDate);
    expect(res.status).toBe(400);
  });

  it('잘못된 날짜 형식은 400 반환', async () => {
    const res = await request(buildApp()).post('/blueprints').send({ ...BLUEPRINT_BODY, date: '2026/04/08' });
    expect(res.status).toBe(400);
  });
});

// ============================================================
// GET /html/:name — DB 기반 viz 반환
// ============================================================
describe('GET /html/:name', () => {
  beforeEach(() => mockPool.query.mockReset());

  it('유효한 name으로 요청 시 200 + HTML Content-Type 반환', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ content: '<html><body>viz</body></html>' }] });
    const res = await request(buildApp()).get('/html/todo-architecture');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
  });

  it('알 수 없는 name이면 404 반환', async () => {
    const res = await request(buildApp()).get('/html/unknown-name');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Unknown html/);
  });

  it('DB에 데이터 없으면 404 반환', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(buildApp()).get('/html/todo-architecture');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/File not found/);
  });

  it('응답 본문이 DB content를 포함함', async () => {
    const HTML_CONTENT = '<html><body><h1>Enterprise Vibe Architecture</h1></body></html>';
    mockPool.query.mockResolvedValueOnce({ rows: [{ content: HTML_CONTENT }] });
    const res = await request(buildApp()).get('/html/todo-architecture');
    expect(res.text).toContain('Enterprise Vibe Architecture');
  });
});

// ============================================================
// GET /references — evaluations join
// ============================================================
describe('GET /references', () => {
  beforeEach(() => mockPool.query.mockReset());

  it('evaluations 없는 레퍼런스는 빈 배열 반환', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 1, title: 'Article A', url: 'https://example.com', summary: 'summary', tags: ['ai'], created_at: '2026-04-10T00:00:00Z', evaluations: [] }],
    });
    const res = await request(buildApp()).get('/references');
    expect(res.status).toBe(200);
    expect(res.body.references[0].evaluations).toEqual([]);
  });

  it('evaluations가 있으면 skill·verdict·gaps 포함해서 반환', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{
        id: 2, title: 'Code Agent Orchestra', url: 'https://addyosmani.com/blog/code-agent-orchestra/',
        summary: '...', tags: ['ai', 'workflow'], created_at: '2026-04-10T00:00:00Z',
        evaluations: [{ skill: 'tdd-guard-claude', verdict: 'partial', gaps: ['계획 승인 단계 없음'], suggestions: [], date: '2026-04-10' }],
      }],
    });
    const res = await request(buildApp()).get('/references');
    expect(res.status).toBe(200);
    const ev = res.body.references[0].evaluations[0];
    expect(ev.skill).toBe('tdd-guard-claude');
    expect(ev.verdict).toBe('partial');
    expect(ev.gaps).toContain('계획 승인 단계 없음');
  });

  it('tag 필터 적용 시 WHERE 조건 포함된 쿼리 실행', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(buildApp()).get('/references?tag=ai');
    expect(res.status).toBe(200);
    const [sql, params] = mockPool.query.mock.calls[0];
    expect(sql).toMatch(/WHERE/);
    expect(params[0]).toBe('["ai"]');
  });
});

// ============================================================
// GET /evaluations — 전체 평가 이력 반환
// ============================================================
describe('GET /evaluations', () => {
  beforeEach(() => mockPool.query.mockReset());

  it('전체 평가 목록을 반환', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          skill: 'tdd-guard-claude',
          date: '2026-04-10',
          article_title: 'Code Agent Orchestra',
          article_url: 'https://addyosmani.com/blog/code-agent-orchestra/',
          gaps: ['계획 승인 단계 없음'],
          suggestions: [],
          verdict: 'partial',
          created_at: '2026-04-10T00:00:00Z',
        },
      ],
    });
    const res = await request(buildApp()).get('/evaluations');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.evaluations)).toBe(true);
    expect(res.body.evaluations[0]).toMatchObject({
      skill: 'tdd-guard-claude',
      verdict: 'partial',
    });
  });

  it('평가 없으면 빈 배열 반환', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(buildApp()).get('/evaluations');
    expect(res.status).toBe(200);
    expect(res.body.evaluations).toEqual([]);
  });

  it('skill 필터 적용 시 쿼리에 파라미터가 전달됨', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(buildApp()).get('/evaluations?skill=tdd-guard-claude');
    expect(res.status).toBe(200);
    const [sql, params] = mockPool.query.mock.calls[0];
    expect(sql).toMatch(/WHERE/);
    expect(params[0]).toBe('tdd-guard-claude');
  });

  it('DB 오류 시 500 반환', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('DB connection failed'));
    const res = await request(buildApp()).get('/evaluations');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to read evaluations');
  });
});

// ============================================================
// PATCH /evaluations/:id — gap_decisions 업데이트
// ============================================================
describe('PATCH /evaluations/:id', () => {
  beforeEach(() => mockPool.query.mockReset());

  const GAP_DECISIONS = [
    { index: 0, type: 'gap', decision: 'resolve', issue_number: 42 },
    { index: 1, type: 'suggestion', decision: 'skip' },
  ];

  it('gap_decisions 업데이트 성공 → 200 + { id, gap_decisions }', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 1, gap_decisions: GAP_DECISIONS }],
    });
    const res = await request(buildApp())
      .patch('/evaluations/1')
      .send({ gap_decisions: GAP_DECISIONS });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 1, gap_decisions: GAP_DECISIONS });
  });

  it('존재하지 않는 id → 404', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(buildApp())
      .patch('/evaluations/9999')
      .send({ gap_decisions: GAP_DECISIONS });
    expect(res.status).toBe(404);
  });

  it('gap_decisions 누락 → 400', async () => {
    const res = await request(buildApp())
      .patch('/evaluations/1')
      .send({});
    expect(res.status).toBe(400);
  });

  it('DB 에러 → 500', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('DB connection failed'));
    const res = await request(buildApp())
      .patch('/evaluations/1')
      .send({ gap_decisions: GAP_DECISIONS });
    expect(res.status).toBe(500);
  });
});

// ============================================================
// DELETE /evaluations/:id — 평가 삭제
// ============================================================
describe('DELETE /evaluations/:id', () => {
  beforeEach(() => mockPool.query.mockReset());

  it('존재하는 평가를 삭제하면 ok: true를 반환한다', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(buildApp()).delete('/evaluations/1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('존재하지 않는 평가 삭제 시 404를 반환한다', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(buildApp()).delete('/evaluations/9999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });
});

// ============================================================
// GET /system-map — 시스템 맵 JSON 반환 (AC-6)
// ============================================================

const SYSTEM_MAP_JSON = {
  generated_at: '2026-05-21',
  domains: [
    {
      name: 'harness',
      routes: [
        {
          method: 'GET',
          path: '/logs',
          description: 'GET /api/harness/logs 로그 목록 반환',
          auth: false,
          logic: 'harness.js:9',
          client_fn: { name: 'fetchHarnessLogs', line: 32 },
          test_file: 'backend/tests/routes/harness.test.js',
          req_slug: 'system-map-view',
        },
      ],
    },
  ],
};

describe('GET /system-map', () => {
  beforeEach(() => mockExecSync.mockReset());

  it('200과 구조화된 JSON을 반환한다 — generated_at, domains 배열 포함', async () => {
    // AC-6: GET /api/harness/system-map 호출 시 구조화된 JSON 반환
    mockExecSync.mockReturnValue(JSON.stringify(SYSTEM_MAP_JSON));
    const res = await request(buildApp()).get('/system-map');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('generated_at');
    expect(res.body).toHaveProperty('domains');
    expect(Array.isArray(res.body.domains)).toBe(true);
  });

  it('domains 배열의 각 항목은 name과 routes를 가진다', async () => {
    // 프론트엔드가 도메인별 그룹핑을 할 수 있는 구조여야 한다
    mockExecSync.mockReturnValue(JSON.stringify(SYSTEM_MAP_JSON));
    const res = await request(buildApp()).get('/system-map');
    const domain = res.body.domains[0];
    expect(domain).toHaveProperty('name');
    expect(domain).toHaveProperty('routes');
    expect(Array.isArray(domain.routes)).toBe(true);
  });

  it('routes 배열의 각 항목은 필수 필드를 가진다', async () => {
    // 프론트엔드가 method, path, description, auth, logic, test_file, req_slug를 렌더링해야 한다
    mockExecSync.mockReturnValue(JSON.stringify(SYSTEM_MAP_JSON));
    const res = await request(buildApp()).get('/system-map');
    const route = res.body.domains[0].routes[0];
    expect(route).toHaveProperty('method');
    expect(route).toHaveProperty('path');
    expect(route).toHaveProperty('description');
    expect(route).toHaveProperty('auth');
    expect(route).toHaveProperty('logic');
    expect(route).toHaveProperty('test_file');
    expect(route).toHaveProperty('req_slug');
  });

  it('스크립트가 유효하지 않은 JSON을 반환하면 500을 반환한다', async () => {
    // generate-system-map.js 출력이 파싱 불가능한 경우 클라이언트에게 명확한 에러를 반환해야 한다
    mockExecSync.mockReturnValue('invalid json {{{');
    const res = await request(buildApp()).get('/system-map');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

