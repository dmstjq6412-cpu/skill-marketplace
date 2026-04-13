import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.hoisted(() => vi.fn());

vi.mock('fs', () => ({
  default: { readFileSync: vi.fn().mockReturnValue('CREATE TABLE IF NOT EXISTS test();') },
}));

vi.mock('pg', () => ({
  default: {
    Pool: function MockPool() {
      return { query: mockQuery };
    },
  },
}));

const { initDbWithRetry } = await import('../../src/db/database.js');

describe('initDbWithRetry', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('성공 시 한 번만 query 호출', async () => {
    mockQuery.mockResolvedValueOnce({});
    await expect(initDbWithRetry()).resolves.toBeUndefined();
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('첫 시도 실패 후 재시도 성공', async () => {
    mockQuery
      .mockRejectedValueOnce(new Error('EAI_AGAIN'))
      .mockResolvedValueOnce({});

    await expect(initDbWithRetry({ retries: 1, delayMs: 0 })).resolves.toBeUndefined();
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('모든 재시도 실패 시 에러 throw', async () => {
    mockQuery.mockRejectedValue(new Error('EAI_AGAIN'));

    await expect(initDbWithRetry({ retries: 1, delayMs: 0 })).rejects.toThrow('EAI_AGAIN');
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('retries=0 이면 재시도 없이 바로 throw', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connection refused'));

    await expect(initDbWithRetry({ retries: 0 })).rejects.toThrow('connection refused');
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});
