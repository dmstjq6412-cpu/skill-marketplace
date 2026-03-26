import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';

// --- Mocks ---
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '1' }),
  useNavigate: () => vi.fn(),
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}));

vi.mock('../components/MarkdownViewer', () => ({
  default: ({ content }) => <div data-testid="markdown-viewer">{content}</div>,
}));

const mockFetchSkill = vi.fn();
const mockFetchSkillFile = vi.fn();
const mockDeleteSkill = vi.fn();

vi.mock('../api/client', () => ({
  fetchSkill: (...args) => mockFetchSkill(...args),
  fetchSkillFile: (...args) => mockFetchSkillFile(...args),
  deleteSkill: (...args) => mockDeleteSkill(...args),
  getDownloadUrl: (id) => `/api/skills/${id}/download`,
}));

// Import component AFTER mocks
const { default: SkillDetailPage } = await import('../pages/SkillDetailPage');

// --- Fixtures ---
const BASE_SKILL = {
  id: 1,
  name: 'git-convention',
  version: '2.1.0',
  author: 'tester',
  description: '팀 Git 컨벤션',
  readme: '# Git Convention Skill',
  file_type: 'zip',
  downloads: 42,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  versions: [{ id: 1, version: '2.1.0', created_at: '2026-01-01T00:00:00Z', downloads: 42 }],
  ref_files: [],
};

function renderPage() {
  return render(<SkillDetailPage />);
}

// ============================================================
// Reference Files 섹션 렌더링
// ============================================================
describe('Reference Files 섹션', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ref_files가 빈 배열이면 섹션이 렌더링되지 않음', async () => {
    mockFetchSkill.mockResolvedValue({ ...BASE_SKILL, ref_files: [] });
    renderPage();

    await waitFor(() => expect(screen.queryByText('Reference Files')).not.toBeInTheDocument());
  });

  it('ref_files가 없으면(undefined) 섹션이 렌더링되지 않음', async () => {
    const { ref_files, ...skillWithoutRefFiles } = BASE_SKILL;
    mockFetchSkill.mockResolvedValue(skillWithoutRefFiles);
    renderPage();

    await waitFor(() => expect(screen.queryByText('Reference Files')).not.toBeInTheDocument());
  });

  it('ref_files가 있으면 섹션 헤더와 파일 목록이 렌더링됨', async () => {
    mockFetchSkill.mockResolvedValue({
      ...BASE_SKILL,
      ref_files: [
        { id: 10, file_path: 'references/branch.md' },
        { id: 11, file_path: 'references/commit.md' },
      ],
    });
    renderPage();

    await waitFor(() => expect(screen.getByText('Reference Files')).toBeInTheDocument());
    expect(screen.getByText('references/branch.md')).toBeInTheDocument();
    expect(screen.getByText('references/commit.md')).toBeInTheDocument();
  });

  it('파일 수 배지가 올바르게 표시됨', async () => {
    mockFetchSkill.mockResolvedValue({
      ...BASE_SKILL,
      ref_files: [
        { id: 10, file_path: 'references/branch.md' },
        { id: 11, file_path: 'references/commit.md' },
        { id: 12, file_path: 'references/merge.md' },
      ],
    });
    renderPage();

    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument());
  });
});

// ============================================================
// 파일 클릭 → 내용 fetch 및 표시
// ============================================================
describe('Reference File 클릭 동작', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchSkill.mockResolvedValue({
      ...BASE_SKILL,
      ref_files: [
        { id: 10, file_path: 'references/branch.md' },
      ],
    });
  });

  it('파일 클릭 시 fetchSkillFile이 올바른 인자로 호출됨', async () => {
    mockFetchSkillFile.mockResolvedValue({
      file_path: 'references/branch.md',
      content: '# Branch Guide',
    });
    renderPage();

    await waitFor(() => screen.getByText('references/branch.md'));
    fireEvent.click(screen.getByText('references/branch.md'));

    expect(mockFetchSkillFile).toHaveBeenCalledWith('1', 10);
  });

  it('파일 클릭 후 내용이 MarkdownViewer로 렌더링됨', async () => {
    mockFetchSkillFile.mockResolvedValue({
      file_path: 'references/branch.md',
      content: '# Branch Guide\n브랜치 규칙입니다.',
    });
    renderPage();

    await waitFor(() => screen.getByText('references/branch.md'));
    fireEvent.click(screen.getByText('references/branch.md'));

    await waitFor(() => {
      const viewers = screen.getAllByTestId('markdown-viewer');
      const refViewer = viewers.find(el => el.textContent.includes('Branch Guide'));
      expect(refViewer).toBeDefined();
    });
  });

  it('같은 파일을 다시 클릭하면 내용이 닫힘', async () => {
    mockFetchSkillFile.mockResolvedValue({
      file_path: 'references/branch.md',
      content: '# Branch Guide',
    });
    renderPage();

    await waitFor(() => screen.getByText('references/branch.md'));
    fireEvent.click(screen.getByText('references/branch.md'));

    await waitFor(() => {
      const viewers = screen.getAllByTestId('markdown-viewer');
      expect(viewers.some(el => el.textContent.includes('Branch Guide'))).toBe(true);
    });

    // 다시 클릭해서 닫기
    fireEvent.click(screen.getByText('references/branch.md'));
    await waitFor(() => {
      const viewers = screen.queryAllByTestId('markdown-viewer');
      expect(viewers.every(el => !el.textContent.includes('Branch Guide'))).toBe(true);
    });
  });

  it('이미 로드된 파일은 fetchSkillFile을 재호출하지 않음', async () => {
    mockFetchSkillFile.mockResolvedValue({
      file_path: 'references/branch.md',
      content: '# Branch Guide',
    });
    renderPage();

    await waitFor(() => screen.getByText('references/branch.md'));
    fireEvent.click(screen.getByText('references/branch.md'));
    await waitFor(() => expect(mockFetchSkillFile).toHaveBeenCalledTimes(1));

    // 닫고 다시 열기
    fireEvent.click(screen.getByText('references/branch.md'));
    fireEvent.click(screen.getByText('references/branch.md'));

    expect(mockFetchSkillFile).toHaveBeenCalledTimes(1); // 캐시 사용
  });

  it('fetch 실패 시 에러 메시지 표시', async () => {
    mockFetchSkillFile.mockRejectedValue(new Error('Network Error'));
    renderPage();

    await waitFor(() => screen.getByText('references/branch.md'));
    fireEvent.click(screen.getByText('references/branch.md'));

    await waitFor(() => {
      const viewers = screen.getAllByTestId('markdown-viewer');
      const errorViewer = viewers.find(el => el.textContent.includes('불러오지 못했습니다'));
      expect(errorViewer).toBeDefined();
    });
  });
});

// ============================================================
// 기존 기능 회귀: README 렌더링 정상 동작
// ============================================================
describe('기존 기능 회귀', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('README가 MarkdownViewer로 렌더링됨', async () => {
    mockFetchSkill.mockResolvedValue({ ...BASE_SKILL, ref_files: [] });
    renderPage();

    await waitFor(() => {
      const viewers = screen.getAllByTestId('markdown-viewer');
      expect(viewers.some(el => el.textContent.includes('Git Convention Skill'))).toBe(true);
    });
  });

  it('스킬 이름, 버전, 작성자가 표시됨', async () => {
    mockFetchSkill.mockResolvedValue({ ...BASE_SKILL, ref_files: [] });
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('git-convention').length).toBeGreaterThan(0);
      expect(screen.getByText(/v2\.1\.0/)).toBeInTheDocument();
      expect(screen.getByText('tester')).toBeInTheDocument();
    });
  });

  it('ref_files 있어도 README는 그대로 표시됨', async () => {
    mockFetchSkill.mockResolvedValue({
      ...BASE_SKILL,
      ref_files: [{ id: 10, file_path: 'references/branch.md' }],
    });
    renderPage();

    await waitFor(() => {
      const viewers = screen.getAllByTestId('markdown-viewer');
      expect(viewers.some(el => el.textContent.includes('Git Convention Skill'))).toBe(true);
      expect(screen.getByText('Reference Files')).toBeInTheDocument();
    });
  });
});
