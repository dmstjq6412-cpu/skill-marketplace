import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// vi.mock is hoisted above const declarations, so we use vi.hoisted to avoid TDZ
const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

const mockPool = vi.hoisted(() => ({ query: vi.fn() }));

// 'import fs from "fs"' expects a default export — wrap mockFs accordingly
vi.mock('fs', () => ({ default: mockFs }));
vi.mock('../../src/db/database.js', () => ({ getPool: () => mockPool }));

// Import router AFTER mocking
const { default: harnessRouter } = await import('../../src/routes/harness.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', harnessRouter);
  return app;
}

const LOG_CONTENT = `# Harness Lab — 2026-04-08\n\n## 작업 요약\nharness-lab 기능 구현\n\n## 개선 포인트\n테스트 누락 발견`;
const BLUEPRINT = {
  date: '2026-04-08',
  skills: [
    { name: 'tdd-guard-claude', status: 'DONE', version: 'v2.0.0', role: '테스트 자동 작성' },
    { name: 'security-guard', status: 'TODO', version: null, role: '보안 취약점 탐지' },
  ],
  coverage: { current: 45, description: '현재' },
  pipeline: 'tdd → code-reviewer → git-guard',
  session_summary: 'harness-lab 기능 구현',
};

// ============================================================
// GET /logs
// ============================================================
describe('GET /logs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('로그 파일이 없으면 빈 배열 반환', async () => {
    mockFs.existsSync.mockReturnValue(false);
    const res = await request(buildApp()).get('/logs');
    expect(res.status).toBe(200);
    expect(res.body.logs).toEqual([]);
  });

  it('로그 파일 목록을 날짜 역순으로 반환', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue(['2026-04-07.md', '2026-04-08.md']);
    mockFs.readFileSync.mockReturnValue(LOG_CONTENT);
    const res = await request(buildApp()).get('/logs');
    expect(res.status).toBe(200);
    expect(res.body.logs[0].date).toBe('2026-04-08');
    expect(res.body.logs[1].date).toBe('2026-04-07');
  });

  it('각 로그에 date와 summary 필드가 포함됨', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue(['2026-04-08.md']);
    mockFs.readFileSync.mockReturnValue(LOG_CONTENT);
    const res = await request(buildApp()).get('/logs');
    expect(res.body.logs[0]).toMatchObject({ date: '2026-04-08', summary: expect.any(String) });
  });

  it('summary는 작업 요약 섹션에서 추출되어 120자 이하', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue(['2026-04-08.md']);
    mockFs.readFileSync.mockReturnValue(LOG_CONTENT);
    const res = await request(buildApp()).get('/logs');
    expect(res.body.logs[0].summary.length).toBeLessThanOrEqual(120);
    expect(res.body.logs[0].summary).toContain('harness-lab');
  });

  it('.md 확장자가 아닌 파일은 무시됨', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue(['2026-04-08.md', '.DS_Store', 'readme.txt']);
    mockFs.readFileSync.mockReturnValue(LOG_CONTENT);
    const res = await request(buildApp()).get('/logs');
    expect(res.body.logs).toHaveLength(1);
  });
});

// ============================================================
// GET /logs/:date
// ============================================================
describe('GET /logs/:date', () => {
  beforeEach(() => vi.clearAllMocks());

  it('존재하는 날짜 로그를 반환', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(LOG_CONTENT);
    const res = await request(buildApp()).get('/logs/2026-04-08');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ date: '2026-04-08', content: LOG_CONTENT });
  });

  it('존재하지 않는 날짜는 404 반환', async () => {
    mockFs.existsSync.mockReturnValue(false);
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
  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.existsSync.mockReturnValue(true);
    mockFs.writeFileSync.mockReturnValue(undefined);
  });

  it('유효한 date+content로 로그 저장 성공', async () => {
    const res = await request(buildApp())
      .post('/logs')
      .send({ date: '2026-04-08', content: LOG_CONTENT });
    expect(res.status).toBe(201);
    expect(res.body.date).toBe('2026-04-08');
    expect(mockFs.writeFileSync).toHaveBeenCalledOnce();
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
// GET /blueprints
// ============================================================
describe('GET /blueprints', () => {
  beforeEach(() => vi.clearAllMocks());

  it('블루프린트 파일이 없으면 빈 배열 반환', async () => {
    mockFs.existsSync.mockReturnValue(false);
    const res = await request(buildApp()).get('/blueprints');
    expect(res.status).toBe(200);
    expect(res.body.blueprints).toEqual([]);
  });

  it('블루프린트 목록을 날짜 역순으로 반환', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue(['2026-04-07.json', '2026-04-08.json']);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(BLUEPRINT));
    const res = await request(buildApp()).get('/blueprints');
    expect(res.status).toBe(200);
    expect(res.body.blueprints[0].date).toBe('2026-04-08');
  });

  it('각 블루프린트에 coverage와 session_summary 포함', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue(['2026-04-08.json']);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(BLUEPRINT));
    const res = await request(buildApp()).get('/blueprints');
    expect(res.body.blueprints[0].coverage).toMatchObject({ current: 45 });
    expect(res.body.blueprints[0].session_summary).toBe('harness-lab 기능 구현');
  });

  it('JSON 파싱 실패한 파일은 date만 반환 (에러 전파 안 됨)', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue(['2026-04-08.json']);
    mockFs.readFileSync.mockReturnValue('invalid json{{{');
    const res = await request(buildApp()).get('/blueprints');
    expect(res.status).toBe(200);
    expect(res.body.blueprints[0]).toMatchObject({ date: '2026-04-08' });
  });
});

// ============================================================
// GET /blueprints/:date
// ============================================================
describe('GET /blueprints/:date', () => {
  beforeEach(() => vi.clearAllMocks());

  it('존재하는 날짜 블루프린트 반환', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(BLUEPRINT));
    const res = await request(buildApp()).get('/blueprints/2026-04-08');
    expect(res.status).toBe(200);
    expect(res.body.date).toBe('2026-04-08');
    expect(res.body.skills).toHaveLength(2);
  });

  it('존재하지 않는 날짜는 404 반환', async () => {
    mockFs.existsSync.mockReturnValue(false);
    const res = await request(buildApp()).get('/blueprints/2026-04-08');
    expect(res.status).toBe(404);
  });

  it('잘못된 날짜 형식은 400 반환', async () => {
    const res = await request(buildApp()).get('/blueprints/not-a-date');
    expect(res.status).toBe(400);
  });
});

// ============================================================
// POST /blueprints
// ============================================================
describe('POST /blueprints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.existsSync.mockReturnValue(true);
    mockFs.writeFileSync.mockReturnValue(undefined);
  });

  it('유효한 블루프린트 저장 성공', async () => {
    const res = await request(buildApp()).post('/blueprints').send(BLUEPRINT);
    expect(res.status).toBe(201);
    expect(res.body.date).toBe('2026-04-08');
    expect(mockFs.writeFileSync).toHaveBeenCalledOnce();
  });

  it('date 없으면 400 반환', async () => {
    const { date: _, ...withoutDate } = BLUEPRINT;
    const res = await request(buildApp()).post('/blueprints').send(withoutDate);
    expect(res.status).toBe(400);
  });

  it('잘못된 날짜 형식은 400 반환', async () => {
    const res = await request(buildApp()).post('/blueprints').send({ ...BLUEPRINT, date: '2026/04/08' });
    expect(res.status).toBe(400);
  });
});

// ============================================================
// GET /blueprints/diff — 라우트 순서 회귀 테스트
// NOTE: /blueprints/diff 가 /blueprints/:date 보다 먼저 등록돼야 'diff'가 :date로 매칭되지 않음
// ============================================================
describe('GET /blueprints/diff', () => {
  const FROM = BLUEPRINT;
  const TO = {
    ...BLUEPRINT,
    date: '2026-04-09',
    skills: [
      { name: 'tdd-guard-claude', status: 'DONE', version: 'v2.1.0', role: '테스트 자동 작성' },
      { name: 'security-guard', status: 'DONE', version: 'v1.0.0', role: '보안 취약점 탐지' },
      { name: 'git-guard-claude', status: 'DONE', version: 'v1.0.0', role: '브랜치/커밋 컨벤션' },
    ],
    coverage: { current: 65, description: 'security-guard 추가 후' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockImplementation((filePath) => {
      if (String(filePath).includes('2026-04-08')) return JSON.stringify(FROM);
      if (String(filePath).includes('2026-04-09')) return JSON.stringify(TO);
    });
  });

  it('/blueprints/diff 가 :date 라우트에 잡히지 않고 diff 핸들러로 처리됨', async () => {
    const res = await request(buildApp()).get('/blueprints/diff?from=2026-04-08&to=2026-04-09');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('changes');
  });

  it('from/to 쿼리 파라미터 없으면 400 반환', async () => {
    const res = await request(buildApp()).get('/blueprints/diff');
    expect(res.status).toBe(400);
  });

  it('from 블루프린트 없으면 404 반환', async () => {
    mockFs.existsSync.mockReturnValueOnce(false);
    const res = await request(buildApp()).get('/blueprints/diff?from=2026-04-08&to=2026-04-09');
    expect(res.status).toBe(404);
  });

  it('스킬 상태 변화(TODO→DONE)가 changed로 감지됨', async () => {
    const res = await request(buildApp()).get('/blueprints/diff?from=2026-04-08&to=2026-04-09');
    const changed = res.body.changes.find(c => c.name === 'security-guard');
    expect(changed.type).toBe('changed');
    expect(changed.before.status).toBe('TODO');
    expect(changed.after.status).toBe('DONE');
  });

  it('새로 추가된 스킬이 added로 감지됨', async () => {
    const res = await request(buildApp()).get('/blueprints/diff?from=2026-04-08&to=2026-04-09');
    const added = res.body.changes.find(c => c.name === 'git-guard-claude');
    expect(added.type).toBe('added');
  });

  it('변화 없는 스킬은 changes에 포함되지 않음', async () => {
    const sameBlueprint = { ...FROM, date: '2026-04-09' };
    mockFs.readFileSync.mockImplementation((filePath) => {
      if (String(filePath).includes('2026-04-08')) return JSON.stringify(FROM);
      if (String(filePath).includes('2026-04-09')) return JSON.stringify(sameBlueprint);
    });
    const res = await request(buildApp()).get('/blueprints/diff?from=2026-04-08&to=2026-04-09');
    expect(res.body.changes).toHaveLength(0);
  });

  it('버전 변경(v2.0.0→v2.1.0)도 changed로 감지됨', async () => {
    const res = await request(buildApp()).get('/blueprints/diff?from=2026-04-08&to=2026-04-09');
    const changed = res.body.changes.find(c => c.name === 'tdd-guard-claude');
    expect(changed.type).toBe('changed');
    expect(changed.before.version).toBe('v2.0.0');
    expect(changed.after.version).toBe('v2.1.0');
  });

  it('coverage_before와 coverage_after가 응답에 포함됨', async () => {
    const res = await request(buildApp()).get('/blueprints/diff?from=2026-04-08&to=2026-04-09');
    expect(res.body.coverage_before.current).toBe(45);
    expect(res.body.coverage_after.current).toBe(65);
  });
});

// ============================================================
// GET /html/:name
// ============================================================
describe('GET /html/:name', () => {
  beforeEach(() => vi.clearAllMocks());

  it('유효한 name(todo-architecture)으로 요청 시 200 + HTML Content-Type 반환', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('<html><body>todo-architecture</body></html>');
    const res = await request(buildApp()).get('/html/todo-architecture');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
  });

  it('유효한 name(git-guard)으로 요청 시 200 반환', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('<html><body>git-guard</body></html>');
    const res = await request(buildApp()).get('/html/git-guard');
    expect(res.status).toBe(200);
  });

  it('알 수 없는 name이면 404 반환', async () => {
    const res = await request(buildApp()).get('/html/unknown-name');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Unknown html/);
  });

  it('파일이 존재하지 않으면(existsSync false) 404 반환', async () => {
    mockFs.existsSync.mockReturnValue(false);
    const res = await request(buildApp()).get('/html/todo-architecture');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/File not found/);
  });

  it('응답 본문이 readFileSync에서 반환한 내용을 포함함', async () => {
    const HTML_CONTENT = '<html><body><h1>Enterprise Vibe Architecture</h1></body></html>';
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(HTML_CONTENT);
    const res = await request(buildApp()).get('/html/todo-architecture');
    expect(res.text).toContain('Enterprise Vibe Architecture');
  });
});

// ============================================================
// GET /references — evaluations join
// ============================================================
describe('GET /references', () => {
  beforeEach(() => vi.clearAllMocks());

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
