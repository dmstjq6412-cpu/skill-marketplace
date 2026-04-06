# 백엔드 테스트 패턴 (Vitest + Supertest)

## 기본 설정 구조

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// 1. DB 모킹 선언 (import 전)
const mockPool = {
  query: vi.fn(),
  connect: vi.fn(),
};
const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
};

vi.mock('../../src/db/database.js', () => ({
  getPool: () => mockPool,
}));

// 2. 라우터 import (모킹 이후)
const { default: myRouter } = await import('../../src/routes/myRoute.js');

// 3. 테스트용 앱 빌더
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', myRouter);
  return app;
}
```

---

## CRUD 엔드포인트 테스트

### GET (목록 조회)

```javascript
describe('GET / (목록)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('데이터가 있으면 200과 배열 반환', async () => {
    mockPool.query.mockResolvedValue({
      rows: [{ id: 1, name: 'item1' }, { id: 2, name: 'item2' }],
    });

    const res = await request(buildApp()).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('데이터가 없으면 200과 빈 배열 반환', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    const res = await request(buildApp()).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('DB 오류 → 500 반환', async () => {
    mockPool.query.mockRejectedValue(new Error('DB error'));

    const res = await request(buildApp()).get('/');
    expect(res.status).toBe(500);
  });
});
```

### GET (단건 조회)

```javascript
describe('GET /:id (단건)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('존재하는 id → 200과 데이터 반환', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ id: 1, name: 'item1' }] });

    const res = await request(buildApp()).get('/1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });

  it('존재하지 않는 id → 404 반환', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    const res = await request(buildApp()).get('/999');
    expect(res.status).toBe(404);
  });
});
```

### POST (생성)

```javascript
describe('POST / (생성)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockImplementation((sql) => {
      if (sql.includes('BEGIN')) return Promise.resolve();
      if (sql.includes('INSERT')) return Promise.resolve({ rows: [{ id: 1 }] });
      if (sql.includes('COMMIT')) return Promise.resolve();
      return Promise.resolve({ rows: [] });
    });
    mockClient.release.mockResolvedValue(undefined);
  });

  it('유효한 데이터 → 201과 id 반환', async () => {
    const res = await request(buildApp())
      .post('/')
      .send({ name: 'new-item', author: 'user' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(1);
  });

  it('필수 필드 누락 → 400 반환', async () => {
    const res = await request(buildApp())
      .post('/')
      .send({}); // name 누락

    expect(res.status).toBe(400);
  });

  it('DB 오류 → ROLLBACK 후 500 반환', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql.includes('INSERT')) return Promise.reject(new Error('DB fail'));
      return Promise.resolve({ rows: [] });
    });

    const res = await request(buildApp())
      .post('/')
      .send({ name: 'item', author: 'user' });

    expect(res.status).toBe(500);
    const rollback = mockClient.query.mock.calls.find(([s]) => s === 'ROLLBACK');
    expect(rollback).toBeDefined();
    expect(mockClient.release).toHaveBeenCalled();
  });
});
```

### DELETE

```javascript
describe('DELETE /:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('존재하는 id → 204 반환', async () => {
    mockPool.query.mockResolvedValue({ rowCount: 1 });

    const res = await request(buildApp()).delete('/1');
    expect(res.status).toBe(204);
  });

  it('존재하지 않는 id → 404 반환', async () => {
    mockPool.query.mockResolvedValue({ rowCount: 0 });

    const res = await request(buildApp()).delete('/999');
    expect(res.status).toBe(404);
  });
});
```

---

## 파일 업로드 테스트 (multipart/form-data)

```javascript
it('파일 업로드 → 201 반환', async () => {
  const fileContent = Buffer.from('file content', 'utf8');

  const res = await request(buildApp())
    .post('/')
    .field('name', 'my-file')
    .field('author', 'user')
    .attach('file', fileContent, 'test.md');

  expect(res.status).toBe(201);
});
```

---

## 특정 SQL 호출 검증

```javascript
it('올바른 파라미터로 쿼리 호출', async () => {
  mockPool.query.mockResolvedValue({ rows: [{ id: 1 }] });

  await request(buildApp()).get('/5/items/10');

  expect(mockPool.query).toHaveBeenCalledWith(
    expect.stringContaining('WHERE id = $1 AND parent_id = $2'),
    [10, 5]
  );
});
```

---

## 유틸/서비스 함수 단독 테스트

라우터를 거치지 않고 순수 함수를 직접 테스트할 때:

```javascript
import { formatSkillName, parseVersion } from '../../src/utils/helpers.js';

describe('formatSkillName', () => {
  it('소문자 + 하이픈으로 변환', () => {
    expect(formatSkillName('My Skill Name')).toBe('my-skill-name');
  });

  it('이미 올바른 형식이면 그대로 반환', () => {
    expect(formatSkillName('my-skill')).toBe('my-skill');
  });

  it('빈 문자열 → 빈 문자열', () => {
    expect(formatSkillName('')).toBe('');
  });
});
```
