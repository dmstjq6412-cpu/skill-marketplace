import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockAxiosInstance = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
  interceptors: { request: { use: vi.fn() } },
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
}));

describe('getGithubLoginUrl', () => {
  const ORIGINAL_ENV = import.meta.env;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('VITE_API_URL이 설정된 경우 해당 URL로 절대경로 redirectUri를 생성한다', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com');
    vi.stubEnv('VITE_GITHUB_CLIENT_ID', 'test-client-id');

    const { getGithubLoginUrl } = await import('../api/client');
    const url = getGithubLoginUrl();

    expect(url).toContain('client_id=test-client-id');
    expect(url).toContain(encodeURIComponent('https://api.example.com/api/auth/github/callback'));
  });

  it('VITE_API_URL이 없으면 localhost:3001로 fallback하여 절대경로 redirectUri를 생성한다', async () => {
    vi.stubEnv('VITE_API_URL', '');
    vi.stubEnv('VITE_GITHUB_CLIENT_ID', 'test-client-id');

    const { getGithubLoginUrl } = await import('../api/client');
    const url = getGithubLoginUrl();

    // http://localhost:3001 이 redirectUri에 포함되어 절대경로여야 한다
    expect(url).toContain(encodeURIComponent('http://localhost:3001/api/auth/github/callback'));
    // redirectUri 파라미터가 http:// 로 시작하는지 확인 (상대경로 방지)
    const redirectUri = new URL(url).searchParams.get('redirect_uri');
    expect(redirectUri).toMatch(/^https?:\/\//);
    expect(redirectUri).toBe('http://localhost:3001/api/auth/github/callback');
  });

  it('생성된 URL이 GitHub OAuth 엔드포인트를 가리킨다', async () => {
    vi.stubEnv('VITE_GITHUB_CLIENT_ID', 'test-client-id');

    const { getGithubLoginUrl } = await import('../api/client');
    const url = getGithubLoginUrl();

    expect(url).toMatch(/^https:\/\/github\.com\/login\/oauth\/authorize/);
    expect(url).toContain('scope=read%3Auser');
  });
});

describe('deleteHarnessEvaluation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('DELETE /api/harness/evaluations/:id를 호출한다', async () => {
    mockAxiosInstance.delete.mockResolvedValueOnce({ data: { ok: true } });

    const { deleteHarnessEvaluation } = await import('../api/client');
    const result = await deleteHarnessEvaluation(5);

    expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/harness/evaluations/5');
    expect(result).toEqual({ ok: true });
  });
});
