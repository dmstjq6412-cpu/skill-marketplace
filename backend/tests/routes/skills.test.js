import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import AdmZip from 'adm-zip';

// --- DB mock ---
const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
};

const mockPool = {
  query: vi.fn(),
  connect: vi.fn(),
};

vi.mock('../../src/db/database.js', () => ({
  getPool: () => mockPool,
}));

// Import router AFTER mocking
const { default: skillsRouter } = await import('../../src/routes/skills.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', skillsRouter);
  return app;
}

// --- Helpers ---
function makeZip(files) {
  const zip = new AdmZip();
  for (const [name, content] of Object.entries(files)) {
    zip.addFile(name, Buffer.from(content, 'utf8'));
  }
  return zip.toBuffer();
}

const MOCK_SKILL = {
  id: 1,
  name: 'git-convention',
  version: '1.0.0',
  author: 'tester',
  description: 'test desc',
  readme: '# Git Convention',
  file_type: 'zip',
  downloads: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ============================================================
// POST /api/skills
// ============================================================
describe('POST / (upload skill)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockImplementation((sql) => {
      if (sql.includes('INSERT INTO skills')) return Promise.resolve({ rows: [{ id: 1 }] });
      return Promise.resolve({ rows: [] });
    });
    mockClient.release.mockResolvedValue(undefined);
  });

  it('zip with SKILL.md only → skill_files에 INSERT 없음', async () => {
    const zipBuf = makeZip({ 'SKILL.md': '# Hello' });

    const res = await request(buildApp())
      .post('/')
      .field('name', 'my-skill')
      .field('author', 'alice')
      .attach('skill_file', zipBuf, 'my-skill.zip');

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(1);

    // skill_files INSERT가 호출되지 않아야 함
    const insertFileCalls = mockClient.query.mock.calls.filter(
      ([sql]) => sql && sql.includes('INSERT INTO skill_files')
    );
    expect(insertFileCalls).toHaveLength(0);
  });

  it('zip with SKILL.md + 참조 MD 파일 → skill_files에 INSERT 됨', async () => {
    const zipBuf = makeZip({
      'SKILL.md': '# Main',
      'references/branch.md': '# Branch Guide',
      'references/commit.md': '# Commit Guide',
    });

    const res = await request(buildApp())
      .post('/')
      .field('name', 'git-convention')
      .field('author', 'alice')
      .attach('skill_file', zipBuf, 'git-convention.zip');

    expect(res.status).toBe(201);

    const insertFileCalls = mockClient.query.mock.calls.filter(
      ([sql]) => sql && sql.includes('INSERT INTO skill_files')
    );
    expect(insertFileCalls).toHaveLength(2);

    const insertedPaths = insertFileCalls.map(([, params]) => params[1]);
    expect(insertedPaths).toContain('references/branch.md');
    expect(insertedPaths).toContain('references/commit.md');
  });

  it('zip with SKILL.md + 비MD 파일 → 비MD 파일은 skill_files에 저장 안 됨', async () => {
    const zipBuf = makeZip({
      'SKILL.md': '# Main',
      'references/guide.md': '# Guide',
      'package.json': '{}',
      'index.js': 'console.log("hi")',
    });

    await request(buildApp())
      .post('/')
      .field('name', 'my-skill')
      .field('author', 'alice')
      .attach('skill_file', zipBuf, 'my-skill.zip');

    const insertFileCalls = mockClient.query.mock.calls.filter(
      ([sql]) => sql && sql.includes('INSERT INTO skill_files')
    );
    expect(insertFileCalls).toHaveLength(1);
    expect(insertFileCalls[0][1][1]).toBe('references/guide.md');
  });

  it('zip에 SKILL.md 없으면 400 반환', async () => {
    const zipBuf = makeZip({ 'README.md': '# Only README' });

    const res = await request(buildApp())
      .post('/')
      .field('name', 'bad-skill')
      .field('author', 'alice')
      .attach('skill_file', zipBuf, 'bad-skill.zip');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/SKILL\.md/);
  });

  it('DB 오류 발생 시 트랜잭션 ROLLBACK', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql.includes('INSERT INTO skills')) return Promise.reject(new Error('DB error'));
      return Promise.resolve({ rows: [] });
    });

    const zipBuf = makeZip({ 'SKILL.md': '# Main' });

    const res = await request(buildApp())
      .post('/')
      .field('name', 'bad-skill')
      .field('author', 'alice')
      .attach('skill_file', zipBuf, 'bad-skill.zip');

    expect(res.status).toBe(500);
    const rollbackCall = mockClient.query.mock.calls.find(([sql]) => sql === 'ROLLBACK');
    expect(rollbackCall).toBeDefined();
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('md 파일 업로드 → skill_files INSERT 없음', async () => {
    const mdBuf = Buffer.from('# Simple Skill', 'utf8');

    const res = await request(buildApp())
      .post('/')
      .field('name', 'simple-skill')
      .field('author', 'alice')
      .attach('skill_file', mdBuf, 'simple-skill.md');

    expect(res.status).toBe(201);
    const insertFileCalls = mockClient.query.mock.calls.filter(
      ([sql]) => sql && sql.includes('INSERT INTO skill_files')
    );
    expect(insertFileCalls).toHaveLength(0);
  });
});

// ============================================================
// GET /:id
// ============================================================
describe('GET /:id (skill detail)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ref_files가 있으면 응답에 포함', async () => {
    mockPool.query.mockImplementation((sql) => {
      if (sql.includes('FROM skills WHERE id')) {
        return Promise.resolve({ rows: [MOCK_SKILL] });
      }
      if (sql.includes('FROM skills WHERE name')) {
        return Promise.resolve({ rows: [{ id: 1, version: '1.0.0', created_at: new Date().toISOString(), downloads: 0 }] });
      }
      if (sql.includes('FROM skill_files')) {
        return Promise.resolve({
          rows: [
            { id: 10, file_path: 'references/branch.md' },
            { id: 11, file_path: 'references/commit.md' },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(buildApp()).get('/1');

    expect(res.status).toBe(200);
    expect(res.body.ref_files).toHaveLength(2);
    expect(res.body.ref_files[0].file_path).toBe('references/branch.md');
    expect(res.body.ref_files[1].file_path).toBe('references/commit.md');
  });

  it('ref_files가 없으면 빈 배열 반환', async () => {
    mockPool.query.mockImplementation((sql) => {
      if (sql.includes('FROM skills WHERE id')) {
        return Promise.resolve({ rows: [MOCK_SKILL] });
      }
      if (sql.includes('FROM skills WHERE name')) {
        return Promise.resolve({ rows: [{ id: 1, version: '1.0.0', created_at: new Date().toISOString(), downloads: 0 }] });
      }
      if (sql.includes('FROM skill_files')) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(buildApp()).get('/1');

    expect(res.status).toBe(200);
    expect(res.body.ref_files).toEqual([]);
  });

  it('존재하지 않는 id → 404', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    const res = await request(buildApp()).get('/999');
    expect(res.status).toBe(404);
  });
});

// ============================================================
// GET /:id/files/:fileId
// ============================================================
describe('GET /:id/files/:fileId (reference file content)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('파일 내용 정상 반환', async () => {
    mockPool.query.mockResolvedValue({
      rows: [{ file_path: 'references/branch.md', file_data: '# Branch Guide\n\n브랜치 규칙입니다.' }],
    });

    const res = await request(buildApp()).get('/1/files/10');

    expect(res.status).toBe(200);
    expect(res.body.file_path).toBe('references/branch.md');
    expect(res.body.content).toContain('Branch Guide');
  });

  it('올바른 skill_id + fileId로 쿼리', async () => {
    mockPool.query.mockResolvedValue({
      rows: [{ file_path: 'references/commit.md', file_data: '# Commit' }],
    });

    await request(buildApp()).get('/5/files/42');

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM skill_files WHERE id = $1 AND skill_id = $2'),
      [42, 5]
    );
  });

  it('fileId가 해당 skill에 속하지 않으면 404', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    const res = await request(buildApp()).get('/1/files/999');
    expect(res.status).toBe(404);
  });
});
