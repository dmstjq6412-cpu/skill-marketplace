import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

// child_process, https, fs 모킹
vi.mock('child_process', () => ({ execSync: vi.fn() }));
vi.mock('https');
vi.mock('fs');

const TOKEN_CACHE_PATH = path.join(os.homedir(), '.skill-marketplace-token');

// 유효한 JWT 생성 헬퍼 (exp: 1시간 후)
function makeJwt(expOffsetMs = 3600_000) {
  const payload = { exp: Math.floor((Date.now() + expOffsetMs) / 1000) };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
  return `header.${encoded}.sig`;
}

// 만료된 JWT
function expiredJwt() {
  const payload = { exp: Math.floor((Date.now() - 10_000) / 1000) };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
  return `header.${encoded}.sig`;
}

describe('auth.js — isTokenValid (캐시 로직)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('캐시된 유효한 토큰이 있으면 재사용한다', async () => {
    const validToken = makeJwt();
    fs.readFileSync.mockReturnValue(validToken);

    const { getAuthToken } = await import('../../src/lib/auth.js');
    const token = await getAuthToken();

    expect(token).toBe(validToken);
    // gh auth token 호출 안 함
    const { execSync } = await import('child_process');
    expect(execSync).not.toHaveBeenCalled();
  });

  it('캐시 파일이 없으면 gh auth token을 호출한다', async () => {
    fs.readFileSync.mockImplementation(() => { throw new Error('ENOENT'); });

    const { execSync } = await import('child_process');
    execSync.mockReturnValue('gh-token-abc\n');

    // https.request 모킹
    const https = await import('https');
    const mockReq = { write: vi.fn(), end: vi.fn(), on: vi.fn() };
    https.default.request.mockImplementation((url, opts, cb) => {
      const res = {
        statusCode: 200,
        on: (event, handler) => {
          if (event === 'data') handler(JSON.stringify({ token: makeJwt() }));
          if (event === 'end') handler();
        },
      };
      cb(res);
      return mockReq;
    });
    fs.writeFileSync.mockImplementation(() => {});

    const { getAuthToken } = await import('../../src/lib/auth.js');
    const token = await getAuthToken();

    expect(execSync).toHaveBeenCalledWith('gh auth token', expect.any(Object));
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('만료된 캐시 토큰은 재발급한다', async () => {
    fs.readFileSync.mockReturnValue(expiredJwt());

    const { execSync } = await import('child_process');
    execSync.mockReturnValue('gh-token-xyz\n');

    const https = await import('https');
    const mockReq = { write: vi.fn(), end: vi.fn(), on: vi.fn() };
    https.default.request.mockImplementation((url, opts, cb) => {
      const res = {
        statusCode: 200,
        on: (event, handler) => {
          if (event === 'data') handler(JSON.stringify({ token: makeJwt() }));
          if (event === 'end') handler();
        },
      };
      cb(res);
      return mockReq;
    });
    fs.writeFileSync.mockImplementation(() => {});

    const { getAuthToken } = await import('../../src/lib/auth.js');
    await getAuthToken();

    expect(execSync).toHaveBeenCalled();
  });

  it('gh CLI가 없으면 에러 메시지를 던진다', async () => {
    fs.readFileSync.mockImplementation(() => { throw new Error('ENOENT'); });

    const { execSync } = await import('child_process');
    execSync.mockImplementation(() => { throw new Error('command not found'); });

    const { getAuthToken } = await import('../../src/lib/auth.js');
    await expect(getAuthToken()).rejects.toThrow('gh auth login');
  });
});
