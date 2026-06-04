import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const mockNavigate = vi.fn();
const mockUploadSkill = vi.fn();

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams('')],
}));

vi.mock('../api/client', () => ({
  uploadSkill: (...args) => mockUploadSkill(...args),
}));

const { default: UploadPage } = await import('../pages/UploadPage');

function fillBaseForm() {
  fireEvent.change(screen.getByLabelText(/Skill Name/i), { target: { value: 'project-guard' } });
  fireEvent.change(screen.getByLabelText(/Author/i), { target: { value: 'alice' } });
  const file = new File(['# Skill'], 'SKILL.md', { type: 'text/markdown' });
  fireEvent.change(document.querySelector('#file-input'), { target: { files: [file] } });
}

describe('UploadPage target_agent 선택', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadSkill.mockResolvedValue({ id: 10 });
  });

  it('기본 target_agent는 claude로 업로드된다', async () => {
    render(<UploadPage />);

    fillBaseForm();
    fireEvent.click(screen.getByRole('button', { name: /Upload Skill/i }));

    await waitFor(() => expect(mockUploadSkill).toHaveBeenCalled());
    const formData = mockUploadSkill.mock.calls[0][0];
    expect(formData.get('target_agent')).toBe('claude');
  });

  it('Codex를 선택하면 target_agent=codex로 업로드된다', async () => {
    render(<UploadPage />);

    fillBaseForm();
    fireEvent.click(screen.getByLabelText('Codex'));
    fireEvent.click(screen.getByRole('button', { name: /Upload Skill/i }));

    await waitFor(() => expect(mockUploadSkill).toHaveBeenCalled());
    const formData = mockUploadSkill.mock.calls[0][0];
    expect(formData.get('target_agent')).toBe('codex');
  });
});
