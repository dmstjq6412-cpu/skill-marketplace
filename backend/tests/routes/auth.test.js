import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// --- express-rate-limit mock ---
// 기본적으로 모든 요청을 통과시키는 no-op 미들웨어로 mock한다.
// rate limit 초과 시나리오는 각 테스트 케이스에서 rateLimit.default를 재설정한다.
vi.mock('express-rate-limit', () => ({
  default: vi.fn(() => (req, res, next) => next()),
}));

// --- https mock ---
// githubApiGet과 exchangeCodeForToken 모두 https 모듈을 직접 사용하므로
// https.get / https.request를 vi.fn()으로 교체한다.
vi.mock('https', () => {
  const get = vi.fn();
  const request = vi.fn();
  return { default: { get, request } };
});

// --- auth middleware mock ---
// issueJwt는 실제 JWT를 발급하면 /me 테스트가 복잡해지므로
// 결정론적 문자열을 반환하도록 모킹한다.
// authenticate는 헤더에 'Bearer valid-token'이 있을 때만 통과하도록 단순 구현한다.
vi.mock('../../src/middleware/auth.js', () => ({
  issueJwt: vi.fn(() => 'mocked-jwt-token'),
  authenticate: vi.fn((req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    // 헤더에서 유저 정보를 파싱 (테스트에서 JSON.stringify한 값을 넣어 사용)
    req.user = { github_id: 42, username: 'testuser' };
    next();
  }),
}));

// mock 설정 완료 후 라우터 import
const { default: authRouter } = await import('../../src/routes/auth.js');
import https from 'https';
import rateLimit from 'express-rate-limit';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', authRouter);
  return app;
}

// ============================================================
// 헬퍼: https.get mock 응답 구성
// ============================================================
function mockHttpsGet({ statusCode = 200, data = {} } = {}) {
  https.get.mockImplementation((_options, callback) => {
    const res = {
      statusCode,
      on: vi.fn((event, handler) => {
        if (event === 'data') handler(JSON.stringify(data));
        if (event === 'end') handler();
        return res;
      }),
    };
    callback(res);
    return { on: vi.fn() };
  });
}

// 헬퍼: https.request mock 응답 구성 (exchangeCodeForToken용)
function mockHttpsRequest({ data = {} } = {}) {
  https.request.mockImplementation((_options, callback) => {
    const res = {
      on: vi.fn((event, handler) => {
        if (event === 'data') handler(JSON.stringify(data));
        if (event === 'end') handler();
        return res;
      }),
    };
    callback(res);
    const req = {
      on: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
    };
    return req;
  });
}

// ============================================================
// POST /cli
// ============================================================
describe('POST /cli (CLI token 인증)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. token 없을 때 400
  it('token 없으면 400 반환', async () => {
    const res = await request(buildApp())
      .post('/cli')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing token/i);
  });

  // 2. GitHub API 검증 성공 시 { token, username } 반환
  it('GitHub API 검증 성공 시 { token, username } 반환', async () => {
    mockHttpsGet({ statusCode: 200, data: { id: 42, login: 'testuser' } });

    const res = await request(buildApp())
      .post('/cli')
      .send({ token: 'ghp_valid_token' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe('mocked-jwt-token');
    expect(res.body.username).toBe('testuser');
  });

  // 3. GitHub API 검증 실패 시 401
  it('GitHub API 반환 상태코드가 200이 아니면 401 반환', async () => {
    mockHttpsGet({ statusCode: 401, data: { message: 'Bad credentials' } });

    const res = await request(buildApp())
      .post('/cli')
      .send({ token: 'ghp_invalid_token' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/github token verification failed/i);
  });

  // 추가: https.get 자체가 error 이벤트를 발생시키는 경우도 401
  it('https.get 네트워크 오류 시 401 반환', async () => {
    https.get.mockImplementation((_options, _callback) => {
      const req = { on: vi.fn((event, handler) => { if (event === 'error') handler(new Error('Network error')); }) };
      return req;
    });

    const res = await request(buildApp())
      .post('/cli')
      .send({ token: 'ghp_some_token' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/github token verification failed/i);
  });
});

// ============================================================
// GET /github/callback
// ============================================================
describe('GET /github/callback (OAuth 콜백)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 4. code 없을 때 400
  it('code 쿼리 파라미터 없으면 400 반환', async () => {
    const res = await request(buildApp())
      .get('/github/callback');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing code/i);
  });

  // 5. GITHUB_CLIENT_ID 미설정 시 500
  it('GITHUB_CLIENT_ID 미설정 시 500 반환', async () => {
    // 환경변수를 일시적으로 제거
    const originalClientId = process.env.GITHUB_CLIENT_ID;
    const originalClientSecret = process.env.GITHUB_CLIENT_SECRET;
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;

    // auth.js는 모듈 로드 시점에 env를 읽으므로
    // 라우터 내부 GITHUB_CLIENT_ID는 이미 undefined로 캡처되어 있음.
    // 이 테스트는 환경변수가 없는 상태로 서버가 시작된 시나리오를 검증한다.
    const res = await request(buildApp())
      .get('/github/callback?code=some_code');

    // 환경변수 복원
    if (originalClientId !== undefined) process.env.GITHUB_CLIENT_ID = originalClientId;
    if (originalClientSecret !== undefined) process.env.GITHUB_CLIENT_SECRET = originalClientSecret;

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/github oauth not configured/i);
  });

  // 추가: code가 있고 환경변수가 설정된 경우 → /auth/callback?code=xxx 로 redirect
  it('정상 흐름 시 /auth/callback?code=xxx 로 redirect', async () => {
    process.env.GITHUB_CLIENT_ID = 'test_client_id';
    process.env.GITHUB_CLIENT_SECRET = 'test_client_secret';

    mockHttpsRequest({ data: { access_token: 'gho_access_token' } });
    mockHttpsGet({ statusCode: 200, data: { id: 42, login: 'testuser' } });

    const res = await request(buildApp())
      .get('/github/callback?code=auth_code_abc')
      .redirects(0);

    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;

    expect(res.status).toBe(302);
    // JWT 자체가 아닌 일회용 코드가 redirect URL에 포함됨
    expect(res.headers.location).toMatch(/\/auth\/callback\?code=[a-f0-9]+/);
  });
});

// ============================================================
// GET /token (일회용 코드 → JWT 교환)
// ============================================================
describe('GET /token (일회용 코드 교환)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('code 없으면 400 반환', async () => {
    const res = await request(buildApp()).get('/token');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing code/i);
  });

  it('유효하지 않은 code이면 401 반환', async () => {
    const res = await request(buildApp()).get('/token?code=invalid-code');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid or expired/i);
  });
});

// ============================================================
// GET /me
// ============================================================
describe('GET /me (현재 사용자 정보)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 6. 유효한 JWT일 때 유저 정보 반환
  it('Authorization 헤더에 Bearer 토큰이 있으면 유저 정보 반환', async () => {
    const res = await request(buildApp())
      .get('/me')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.github_id).toBe(42);
    expect(res.body.username).toBe('testuser');
  });

  // 7. 토큰 없을 때 401
  it('Authorization 헤더 없으면 401 반환', async () => {
    const res = await request(buildApp())
      .get('/me');

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/authentication required/i);
  });

  // 추가: 'Bearer ' prefix 없이 토큰만 있는 경우도 401
  it('Bearer prefix 없이 토큰만 보내면 401 반환', async () => {
    const res = await request(buildApp())
      .get('/me')
      .set('Authorization', 'invalid-format-token');

    expect(res.status).toBe(401);
  });
});

// ============================================================
// Rate Limiting
// ============================================================
describe('Rate Limiting (15분에 20회 제한)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // POST /cli — rate limit 초과 시 429 반환
  it('POST /cli — rate limit 초과 시 429 반환', async () => {
    // rateLimit mock이 429를 직접 반환하는 미들웨어로 교체
    rateLimit.mockImplementation(() => (req, res, _next) => {
      res.status(429).json({ error: 'Too many requests, please try again later' });
    });

    // 라우터를 새로 import하지 않고 mock 교체 후 buildApp()으로 검증
    const { default: freshRouter } = await import('../../src/routes/auth.js?rate-cli');
    const app = express();
    app.use(express.json());
    app.use('/', freshRouter);

    const res = await request(app)
      .post('/cli')
      .send({ token: 'ghp_some_token' });

    expect(res.status).toBe(429);
    expect(res.body.error).toBe('Too many requests, please try again later');
  });

  // GET /github/callback — rate limit 초과 시 429 반환
  it('GET /github/callback — rate limit 초과 시 429 반환', async () => {
    // rateLimit mock이 429를 직접 반환하는 미들웨어로 교체
    rateLimit.mockImplementation(() => (req, res, _next) => {
      res.status(429).json({ error: 'Too many requests, please try again later' });
    });

    const { default: freshRouter } = await import('../../src/routes/auth.js?rate-callback');
    const app = express();
    app.use(express.json());
    app.use('/', freshRouter);

    const res = await request(app)
      .get('/github/callback?code=some_code');

    expect(res.status).toBe(429);
    expect(res.body.error).toBe('Too many requests, please try again later');
  });
});
