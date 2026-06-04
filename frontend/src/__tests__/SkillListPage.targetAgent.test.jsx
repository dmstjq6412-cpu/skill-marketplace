import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const mockFetchSkills = vi.fn();

vi.mock('../api/client', () => ({
  fetchSkills: (...args) => mockFetchSkills(...args),
}));

vi.mock('../components/SkillCard', () => ({
  default: ({ name, target_agent }) => (
    <article>
      <span>{name}</span>
      <span>{target_agent}</span>
    </article>
  ),
}));

const { default: SkillListPage } = await import('../pages/SkillListPage');

describe('SkillListPage target_agent 필터', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchSkills.mockResolvedValue({
      skills: [
        { id: 1, name: 'project-guard', target_agent: 'claude' },
      ],
      total: 1,
    });
  });

  it('초기 로드는 All 필터로 target_agent 없이 조회한다', async () => {
    render(<SkillListPage />);

    await waitFor(() => {
      expect(mockFetchSkills).toHaveBeenCalledWith('', 1, 'all');
    });
  });

  it('Codex 필터를 선택하면 page를 1로 리셋하고 codex target으로 조회한다', async () => {
    render(<SkillListPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Codex' }));

    await waitFor(() => {
      expect(mockFetchSkills).toHaveBeenCalledWith('', 1, 'codex');
    });
  });

  it('Claude 필터를 선택하면 claude target으로 조회한다', async () => {
    render(<SkillListPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Claude' }));

    await waitFor(() => {
      expect(mockFetchSkills).toHaveBeenCalledWith('', 1, 'claude');
    });
  });
});
