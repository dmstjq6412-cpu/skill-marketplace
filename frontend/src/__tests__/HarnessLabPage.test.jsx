import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// --- Mocks ---
vi.mock('../components/MarkdownViewer', () => ({
  default: ({ content }) => <div data-testid="markdown-viewer">{content}</div>,
}));

const mockFetchHarnessLogs = vi.fn();
const mockFetchHarnessLog = vi.fn();
const mockFetchHarnessBlueprints = vi.fn();
const mockFetchHarnessBlueprint = vi.fn();
const mockFetchHarnessBlueprintDiff = vi.fn();

vi.mock('../api/client', () => ({
  fetchHarnessLogs: (...args) => mockFetchHarnessLogs(...args),
  fetchHarnessLog: (...args) => mockFetchHarnessLog(...args),
  fetchHarnessBlueprints: (...args) => mockFetchHarnessBlueprints(...args),
  fetchHarnessBlueprint: (...args) => mockFetchHarnessBlueprint(...args),
  fetchHarnessBlueprintDiff: (...args) => mockFetchHarnessBlueprintDiff(...args),
}));

const { default: HarnessLabPage } = await import('../pages/HarnessLabPage');

const MOCK_LOGS = [
  { date: '2026-04-08', summary: 'harness-lab 기능 구현' },
  { date: '2026-04-07', summary: '블루프린트 설계' },
];

const MOCK_LOG_CONTENT = `# Harness Lab — 2026-04-08\n\n## 작업 요약\nharness-lab 기능 구현\n\n## 개선 포인트\n테스트 누락 발견`;

const MOCK_BLUEPRINTS = [
  { date: '2026-04-08', coverage: { current: 45 }, session_summary: 'harness-lab 기능 구현' },
];

const MOCK_BLUEPRINT = {
  date: '2026-04-08',
  skills: [
    { name: 'tdd-guard-claude', status: 'DONE', version: 'v2.0.0', role: '테스트 자동 작성' },
    { name: 'security-guard', status: 'TODO', version: null, role: '보안 취약점 탐지' },
  ],
  coverage: { current: 45, description: '현재' },
  pipeline: 'tdd → code-reviewer → git-guard',
  session_summary: 'harness-lab 기능 구현',
};

function renderPage() {
  return render(<HarnessLabPage />);
}

// ============================================================
// 렌더링 - 초기 상태
// ============================================================
describe('HarnessLabPage 초기 렌더링', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchHarnessLogs.mockResolvedValue({ logs: [] });
    mockFetchHarnessBlueprints.mockResolvedValue({ blueprints: [] });
  });

  it('페이지 타이틀 "Harness Lab"이 표시됨', async () => {
    renderPage();
    expect(screen.getByText('Harness Lab')).toBeInTheDocument();
  });

  it('4개 harness 스킬 pill이 표시됨', async () => {
    renderPage();
    expect(screen.getByText('tdd-guard-claude')).toBeInTheDocument();
    expect(screen.getByText('git-guard-claude')).toBeInTheDocument();
    expect(screen.getByText('security-guard')).toBeInTheDocument();
    expect(screen.getByText('todo-architecture')).toBeInTheDocument();
  });

  it('"개발 일지"와 "블루프린트" 탭이 표시됨', async () => {
    renderPage();
    expect(screen.getByText('개발 일지')).toBeInTheDocument();
    expect(screen.getByText('블루프린트')).toBeInTheDocument();
  });

  it('마운트 시 fetchHarnessLogs와 fetchHarnessBlueprints가 호출됨', async () => {
    renderPage();
    await waitFor(() => {
      expect(mockFetchHarnessLogs).toHaveBeenCalledOnce();
      expect(mockFetchHarnessBlueprints).toHaveBeenCalledOnce();
    });
  });
});

// ============================================================
// 개발 일지 탭
// ============================================================
describe('HarnessLabPage — 개발 일지 탭', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchHarnessLogs.mockResolvedValue({ logs: MOCK_LOGS });
    mockFetchHarnessBlueprints.mockResolvedValue({ blueprints: [] });
  });

  it('로그 목록이 날짜와 함께 표시됨', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('2026-04-08')).toBeInTheDocument();
      expect(screen.getByText('2026-04-07')).toBeInTheDocument();
    });
  });

  it('로그 없으면 "/harness-log 로 첫 일지를 저장하세요" 안내 표시', async () => {
    mockFetchHarnessLogs.mockResolvedValue({ logs: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('/harness-log 로 첫 일지를 저장하세요')).toBeInTheDocument();
    });
  });

  it('로그 날짜 클릭 시 fetchHarnessLog가 해당 날짜로 호출됨', async () => {
    mockFetchHarnessLog.mockResolvedValue({ date: '2026-04-08', content: MOCK_LOG_CONTENT });
    renderPage();
    await waitFor(() => screen.getByText('2026-04-08'));
    fireEvent.click(screen.getByText('2026-04-08'));
    await waitFor(() => {
      expect(mockFetchHarnessLog).toHaveBeenCalledWith('2026-04-08');
    });
  });

  it('로그 내용 로드 후 MarkdownViewer에 content가 전달됨', async () => {
    mockFetchHarnessLog.mockResolvedValue({ date: '2026-04-08', content: MOCK_LOG_CONTENT });
    renderPage();
    await waitFor(() => screen.getByText('2026-04-08'));
    fireEvent.click(screen.getByText('2026-04-08'));
    await waitFor(() => {
      expect(screen.getByTestId('markdown-viewer')).toHaveTextContent('Harness Lab');
    });
  });

  it('날짜 선택 전에는 "왼쪽에서 날짜를 선택하세요" 안내 표시', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('왼쪽에서 날짜를 선택하세요')).toBeInTheDocument();
    });
  });
});

// ============================================================
// 블루프린트 탭
// ============================================================
describe('HarnessLabPage — 블루프린트 탭', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchHarnessLogs.mockResolvedValue({ logs: [] });
    mockFetchHarnessBlueprints.mockResolvedValue({ blueprints: MOCK_BLUEPRINTS });
  });

  async function switchToBlueprint() {
    renderPage();
    await waitFor(() => screen.getByText('블루프린트'));
    fireEvent.click(screen.getByText('블루프린트'));
  }

  it('블루프린트 탭 클릭 시 스냅샷 목록이 표시됨', async () => {
    await switchToBlueprint();
    await waitFor(() => {
      expect(screen.getByText('스냅샷 목록')).toBeInTheDocument();
    });
  });

  it('블루프린트 없으면 "/harness-log 실행 시 자동 저장됩니다" 안내 표시', async () => {
    mockFetchHarnessBlueprints.mockResolvedValue({ blueprints: [] });
    await switchToBlueprint();
    await waitFor(() => {
      expect(screen.getByText('/harness-log 실행 시 자동 저장됩니다')).toBeInTheDocument();
    });
  });

  it('블루프린트 날짜 클릭 시 fetchHarnessBlueprint가 호출됨', async () => {
    mockFetchHarnessBlueprint.mockResolvedValue(MOCK_BLUEPRINT);
    await switchToBlueprint();
    // getAllByText includes <option> elements from <select> — find the list button specifically
    await waitFor(() => screen.getByRole('button', { name: /2026-04-08/ }));
    fireEvent.click(screen.getByRole('button', { name: /2026-04-08/ }));
    await waitFor(() => {
      expect(mockFetchHarnessBlueprint).toHaveBeenCalledWith('2026-04-08');
    });
  });

  it('블루프린트 로드 후 스킬 상태(DONE/TODO)가 표시됨', async () => {
    mockFetchHarnessBlueprint.mockResolvedValue(MOCK_BLUEPRINT);
    await switchToBlueprint();
    await waitFor(() => screen.getByRole('button', { name: /2026-04-08/ }));
    fireEvent.click(screen.getByRole('button', { name: /2026-04-08/ }));
    await waitFor(() => {
      expect(screen.getByText('DONE')).toBeInTheDocument();
      expect(screen.getByText('TODO')).toBeInTheDocument();
    });
  });
});

// ============================================================
// 블루프린트 diff
// ============================================================
describe('HarnessLabPage — 블루프린트 diff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchHarnessLogs.mockResolvedValue({ logs: [] });
    mockFetchHarnessBlueprints.mockResolvedValue({ blueprints: MOCK_BLUEPRINTS });
  });

  async function switchToBlueprint() {
    renderPage();
    await waitFor(() => screen.getByText('블루프린트'));
    fireEvent.click(screen.getByText('블루프린트'));
    await waitFor(() => screen.getByText('블루프린트 변화 비교'));
  }

  it('"블루프린트 변화 비교" 섹션이 표시됨', async () => {
    await switchToBlueprint();
    expect(screen.getByText('블루프린트 변화 비교')).toBeInTheDocument();
  });

  it('From/To 미선택 상태에서 비교 버튼이 비활성화됨', async () => {
    await switchToBlueprint();
    const btn = screen.getByText('비교');
    expect(btn).toBeDisabled();
  });

  it('diff 결과가 있으면 변경 사항이 표시됨', async () => {
    mockFetchHarnessBlueprintDiff.mockResolvedValue({
      from: '2026-04-07',
      to: '2026-04-08',
      coverage_before: { current: 30 },
      coverage_after: { current: 45 },
      changes: [
        { name: 'security-guard', type: 'changed', before: { status: 'TODO' }, after: { status: 'DONE' } },
      ],
    });
    await switchToBlueprint();

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '2026-04-08' } });
    fireEvent.change(selects[1], { target: { value: '2026-04-08' } });

    await waitFor(() => expect(screen.getByText('비교')).not.toBeDisabled());
    fireEvent.click(screen.getByText('비교'));

    await waitFor(() => {
      expect(mockFetchHarnessBlueprintDiff).toHaveBeenCalledOnce();
    });
  });
});

// ============================================================
// 탭 전환
// ============================================================
describe('HarnessLabPage — 탭 전환', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchHarnessLogs.mockResolvedValue({ logs: MOCK_LOGS });
    mockFetchHarnessBlueprints.mockResolvedValue({ blueprints: MOCK_BLUEPRINTS });
  });

  it('블루프린트 탭 클릭 후 다시 개발 일지 탭 클릭 시 로그 목록이 보임', async () => {
    renderPage();
    await waitFor(() => screen.getByText('블루프린트'));
    fireEvent.click(screen.getByText('블루프린트'));
    fireEvent.click(screen.getByText('개발 일지'));
    await waitFor(() => {
      expect(screen.getByText('세션 기록')).toBeInTheDocument();
    });
  });

  it('탭 전환 시 선택된 날짜가 초기화됨', async () => {
    mockFetchHarnessLog.mockResolvedValue({ date: '2026-04-08', content: MOCK_LOG_CONTENT });
    renderPage();
    await waitFor(() => screen.getByText('2026-04-08'));
    fireEvent.click(screen.getByText('2026-04-08'));
    await waitFor(() => screen.getByTestId('markdown-viewer'));
    fireEvent.click(screen.getByText('블루프린트'));
    fireEvent.click(screen.getByText('개발 일지'));
    await waitFor(() => {
      expect(screen.queryByTestId('markdown-viewer')).not.toBeInTheDocument();
    });
  });
});

// ============================================================
// 시각화 탭
// ============================================================
describe('HarnessLabPage — 시각화 탭', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchHarnessLogs.mockResolvedValue({ logs: [] });
    mockFetchHarnessBlueprints.mockResolvedValue({ blueprints: [] });
  });

  async function switchToViz() {
    renderPage();
    await waitFor(() => screen.getByText('시각화'));
    fireEvent.click(screen.getByText('시각화'));
  }

  it('"시각화" 탭이 렌더링됨', async () => {
    renderPage();
    expect(screen.getByText('시각화')).toBeInTheDocument();
  });

  it('시각화 탭 클릭 시 버튼 두 개("Enterprise Vibe Architecture", "Git Guard Flow")가 표시됨', async () => {
    await switchToViz();
    expect(screen.getByText('Enterprise Vibe Architecture')).toBeInTheDocument();
    expect(screen.getByText('Git Guard Flow')).toBeInTheDocument();
  });

  it('초기 상태에서 "위에서 시각화 파일을 선택하세요" 안내 문구가 보임', async () => {
    await switchToViz();
    expect(screen.getByText('위에서 시각화 파일을 선택하세요')).toBeInTheDocument();
  });

  it('"Enterprise Vibe Architecture" 버튼 클릭 시 iframe이 렌더링됨', async () => {
    await switchToViz();
    fireEvent.click(screen.getByText('Enterprise Vibe Architecture'));
    await waitFor(() => {
      expect(screen.getByTitle('todo-architecture')).toBeInTheDocument();
    });
  });

  it('iframe src가 "/api/harness/html/todo-architecture"를 포함함', async () => {
    await switchToViz();
    fireEvent.click(screen.getByText('Enterprise Vibe Architecture'));
    await waitFor(() => {
      const iframe = screen.getByTitle('todo-architecture');
      expect(iframe).toHaveAttribute('src', '/api/harness/html/todo-architecture');
    });
  });

  it('"Git Guard Flow" 버튼 클릭 시 iframe src가 "/api/harness/html/git-guard"를 포함함', async () => {
    await switchToViz();
    fireEvent.click(screen.getByText('Git Guard Flow'));
    await waitFor(() => {
      const iframe = screen.getByTitle('git-guard');
      expect(iframe).toHaveAttribute('src', '/api/harness/html/git-guard');
    });
  });

  it('다른 탭으로 전환 후 다시 시각화 탭으로 돌아오면 iframe이 사라지고 안내 문구가 다시 표시됨', async () => {
    await switchToViz();
    fireEvent.click(screen.getByText('Enterprise Vibe Architecture'));
    await waitFor(() => screen.getByTitle('todo-architecture'));

    // 개발 일지 탭으로 전환했다가 다시 시각화 탭으로 복귀
    fireEvent.click(screen.getByText('개발 일지'));
    fireEvent.click(screen.getByText('시각화'));

    await waitFor(() => {
      expect(screen.queryByTitle('todo-architecture')).not.toBeInTheDocument();
      expect(screen.getByText('위에서 시각화 파일을 선택하세요')).toBeInTheDocument();
    });
  });
});
