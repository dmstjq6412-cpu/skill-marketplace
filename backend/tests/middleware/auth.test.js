import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

// --- jwt mock ---
vi.mock('jsonwebtoken');

// JWT_SECRET must be set before module load (module throws if missing)
process.env.JWT_SECRET = 'test-secret-for-unit-tests';

// Import AFTER mocking
const { authenticate, issueJwt } = await import('../../src/middleware/auth.js');

// ============================================================
// authenticate
// ============================================================
describe('authenticate', () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { headers: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  it('Authorization 헤더가 없으면 401 반환', () => {
    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('Bearer가 아닌 헤더이면 401 반환', () => {
    req.headers.authorization = 'Basic dXNlcjpwYXNz';

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('유효한 JWT이면 next() 호출 및 req.user 설정', () => {
    const mockPayload = { github_id: 42, username: 'alice' };
    req.headers.authorization = 'Bearer valid.token.here';
    jwt.verify.mockReturnValue(mockPayload);

    authenticate(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('valid.token.here', expect.any(String));
    expect(req.user).toEqual({ github_id: '42', username: 'alice' });
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('만료/잘못된 JWT이면 401 반환', () => {
    req.headers.authorization = 'Bearer expired.or.invalid.token';
    jwt.verify.mockImplementation(() => { throw new Error('jwt expired'); });

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('github_id가 number이면 string으로 변환', () => {
    const mockPayload = { github_id: 42, username: 'alice' };
    req.headers.authorization = 'Bearer valid.token.here';
    jwt.verify.mockReturnValue(mockPayload);

    authenticate(req, res, next);

    expect(req.user.github_id).toBe('42');
    expect(next).toHaveBeenCalledOnce();
  });

  it('github_id가 null/undefined이면 그대로 유지', () => {
    const mockPayloadNull = { github_id: null, username: 'bob' };
    req.headers.authorization = 'Bearer valid.token.here';
    jwt.verify.mockReturnValue(mockPayloadNull);

    authenticate(req, res, next);

    expect(req.user.github_id).toBeNull();
    expect(next).toHaveBeenCalledOnce();
  });
});

// ============================================================
// issueJwt
// ============================================================
describe('issueJwt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('반환된 토큰이 jwt.verify로 검증 가능한 값인지', () => {
    const fakeToken = 'signed.fake.token';
    jwt.sign.mockReturnValue(fakeToken);
    jwt.verify.mockReturnValue({ github_id: 1, username: 'bob' });

    const token = issueJwt({ github_id: 1, username: 'bob' });

    expect(jwt.sign).toHaveBeenCalledOnce();
    expect(token).toBe(fakeToken);

    // 반환된 토큰이 실제로 verify에 전달 가능한지 확인
    const decoded = jwt.verify(token, expect.any(String));
    expect(decoded).toMatchObject({ github_id: 1, username: 'bob' });
  });

  it('payload(github_id, username)가 sign 호출에 포함되는지', () => {
    jwt.sign.mockReturnValue('some.token');

    issueJwt({ github_id: 99, username: 'carol' });

    expect(jwt.sign).toHaveBeenCalledWith(
      { github_id: 99, username: 'carol' },
      expect.any(String),
      expect.objectContaining({ expiresIn: '7d' })
    );
  });
});
