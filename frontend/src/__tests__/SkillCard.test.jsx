import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// --- Mocks ---
const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../api/client', () => ({
  getDownloadUrl: (id) => `/api/skills/${id}/download`,
}));

// Import component AFTER mocks
const { default: SkillCard } = await import('../components/SkillCard');

// --- Fixtures ---
const MOCK_SKILL = {
  id: 1,
  name: 'git-convention',
  version: '1.0.0',
  author: 'alice',
  description: '팀 Git 컨벤션 스킬',
  downloads: 120,
  created_at: '2026-01-01T00:00:00Z',
};

function renderCard(overrides = {}) {
  return render(<SkillCard {...MOCK_SKILL} {...overrides} />);
}

// ============================================================
// 렌더링 - 정상 동작 (Happy path)
// ============================================================
describe('SkillCard 렌더링', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('스킬 이름이 화면에 표시됨', () => {
    renderCard();
    expect(screen.getByText('git-convention')).toBeInTheDocument();
  });

  it('작성자가 화면에 표시됨', () => {
    renderCard();
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  it('다운로드 수가 화면에 표시됨', () => {
    renderCard();
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('description이 있으면 화면에 표시됨', () => {
    renderCard();
    expect(screen.getByText('팀 Git 컨벤션 스킬')).toBeInTheDocument();
  });

  it('description이 없으면 No description provided 표시됨', () => {
    renderCard({ description: null });
    expect(screen.getByText('No description provided.')).toBeInTheDocument();
  });

  it('description이 빈 문자열이면 No description provided 표시됨', () => {
    renderCard({ description: '' });
    expect(screen.getByText('No description provided.')).toBeInTheDocument();
  });

  it('role="button" 속성이 있어 접근성을 제공함', () => {
    renderCard();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('다운로드 수 1000 이상이면 toLocaleString 포맷으로 표시됨', () => {
    renderCard({ downloads: 1500 });
    expect(screen.getByText(/1[,.]?500/)).toBeInTheDocument();
  });
});

// ============================================================
// onSelect 콜백 호출
// ============================================================
describe('SkillCard 클릭 동작 - onSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('카드 클릭 시 onSelect 콜백이 호출됨', () => {
    const onSelect = vi.fn();
    renderCard({ onSelect });
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('onSelect 콜백에 name, author, downloads가 전달됨', () => {
    const onSelect = vi.fn();
    renderCard({ onSelect });
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'git-convention',
        author: 'alice',
        downloads: 120,
      })
    );
  });

  it('Enter 키 입력 시 onSelect 콜백이 호출됨', () => {
    const onSelect = vi.fn();
    renderCard({ onSelect });
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('Space 키 입력 시 onSelect 콜백이 호출됨', () => {
    const onSelect = vi.fn();
    renderCard({ onSelect });
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('onSelect가 없으면 카드 클릭 시 navigate가 호출됨', () => {
    renderCard({ onSelect: undefined });
    fireEvent.click(screen.getByRole('button'));
    expect(mockNavigate).toHaveBeenCalledWith('/skills/1');
  });

  it('onSelect가 있으면 navigate는 호출되지 않음', () => {
    const onSelect = vi.fn();
    renderCard({ onSelect });
    fireEvent.click(screen.getByRole('button'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('onSelect가 제공되지 않아도 클릭 시 에러가 발생하지 않음', () => {
    renderCard();
    expect(() => {
      fireEvent.click(screen.getByRole('button'));
    }).not.toThrow();
  });
});

// ============================================================
// Download 버튼 테스트
// ============================================================
describe('SkillCard Download 버튼', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Download 버튼이 렌더링됨', () => {
    renderCard();
    expect(screen.getByText('Download')).toBeInTheDocument();
  });

  it('Download 버튼 클릭 시 onSelect가 호출되지 않음 (이벤트 전파 차단)', () => {
    const onSelect = vi.fn();
    renderCard({ onSelect });
    fireEvent.click(screen.getByText('Download'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('Download 링크의 href가 올바르게 설정됨', () => {
    renderCard();
    const downloadLink = screen.getByText('Download').closest('a');
    expect(downloadLink).toHaveAttribute('href', '/api/skills/1/download');
  });
});

// ============================================================
// 경계값 처리
// ============================================================
describe('SkillCard 경계값 처리', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('downloads가 0이면 0이 표시됨', () => {
    renderCard({ downloads: 0 });
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('downloads가 undefined이면 0이 표시됨', () => {
    renderCard({ downloads: undefined });
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('name이 빈 문자열이어도 렌더링이 깨지지 않음', () => {
    renderCard({ name: '' });
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('name이 매우 긴 문자열이어도 렌더링이 깨지지 않음', () => {
    const longName = 'a'.repeat(200);
    renderCard({ name: longName });
    expect(screen.getByText(longName)).toBeInTheDocument();
  });

  it('downloads가 매우 큰 수이면 toLocaleString으로 포맷됨', () => {
    renderCard({ downloads: 9999999 });
    const button = screen.getByRole('button');
    expect(button.textContent).toMatch(/9[,.]?999[,.]?999/);
  });
});

// ============================================================
// 회귀 케이스
// ============================================================
describe('SkillCard 회귀 케이스', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('여러 카드가 각각 독립적으로 onSelect를 호출함', () => {
    const onSelect1 = vi.fn();
    const onSelect2 = vi.fn();

    render(
      <>
        <SkillCard name="skill-a" author="alice" downloads={10} onSelect={onSelect1} />
        <SkillCard name="skill-b" author="bob" downloads={20} onSelect={onSelect2} />
      </>
    );

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);

    expect(onSelect1).toHaveBeenCalledTimes(1);
    expect(onSelect2).not.toHaveBeenCalled();
  });

  it('첫 번째 클릭 이후 두 번째 클릭에도 onSelect가 각각 호출됨', () => {
    const onSelect = vi.fn();
    renderCard({ onSelect });

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button'));

    expect(onSelect).toHaveBeenCalledTimes(2);
  });
});
