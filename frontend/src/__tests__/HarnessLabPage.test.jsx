import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('../components/MarkdownViewer', () => ({
  default: ({ content }) => <div data-testid="markdown-viewer">{content}</div>,
}));

const mockFetchHarnessLogs = vi.fn();
const mockFetchHarnessLog = vi.fn();
const mockFetchHarnessBlueprints = vi.fn();
const mockFetchHarnessBlueprintBySkill = vi.fn();
const mockFetchHarnessAnalyses = vi.fn();
const mockFetchHarnessAnalysis = vi.fn();
const mockFetchHarnessReferences = vi.fn();
const mockDeleteHarnessReference = vi.fn();
const mockFetchHarnessEvaluations = vi.fn();
const mockFetchAllHarnessEvaluations = vi.fn();
const mockPatchHarnessEvaluation = vi.fn();
const mockDeleteHarnessEvaluation = vi.fn();


vi.mock('../api/client', () => ({
  fetchHarnessLogs: (...args) => mockFetchHarnessLogs(...args),
  fetchHarnessLog: (...args) => mockFetchHarnessLog(...args),
  fetchHarnessBlueprints: (...args) => mockFetchHarnessBlueprints(...args),

  fetchHarnessBlueprintBySkill: (...args) => mockFetchHarnessBlueprintBySkill(...args),
  fetchHarnessAnalyses: (...args) => mockFetchHarnessAnalyses(...args),
  fetchHarnessAnalysis: (...args) => mockFetchHarnessAnalysis(...args),
  fetchHarnessReferences: (...args) => mockFetchHarnessReferences(...args),
  deleteHarnessReference: (...args) => mockDeleteHarnessReference(...args),
  fetchHarnessEvaluations: (...args) => mockFetchHarnessEvaluations(...args),
  fetchAllHarnessEvaluations: (...args) => mockFetchAllHarnessEvaluations(...args),
  patchHarnessEvaluation: (...args) => mockPatchHarnessEvaluation(...args),
  deleteHarnessEvaluation: (...args) => mockDeleteHarnessEvaluation(...args),

}));

const { default: HarnessLabPage } = await import('../pages/HarnessLabPage');

const KR = {
  todayHandoff: '\uC624\uB298 \uC778\uACC4',
  copyNextPrompt: '\uB2E4\uC74C \uC5D0\uC774\uC804\uD2B8 \uD504\uB86C\uD504\uD2B8 \uBCF5\uC0AC',
  openTodayLog: '\uC624\uB298 \uB85C\uADF8 \uC5F4\uAE30',
  copyPrompt: '\uD504\uB86C\uD504\uD2B8 \uBCF5\uC0AC',
  copiedNextPrompt: '\uB2E4\uC74C \uC5D0\uC774\uC804\uD2B8 \uD504\uB86C\uD504\uD2B8\uB97C \uBCF5\uC0AC\uD588\uC2B5\uB2C8\uB2E4',
  noWrapups: '\uC544\uC9C1 \uC800\uC7A5\uB41C \uB370\uC77C\uB9AC wrap-up\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.',
  runHarnessLog: '`/harness-log`\uB97C \uC2E4\uD589\uD574 \uCCAB \uAE30\uB85D\uC744 \uC800\uC7A5\uD558\uC138\uC694.',
  blueprintTab: '\uC2A4\uD0AC \uAC1C\uC120\uC774\uB825',
};

const MOCK_EVALUATIONS = [

  {
    id: 1,
    skill: 'tdd-guard-claude',
    date: '2026-04-20',
    article_title: 'TDD Best Practices',
    article_url: 'https://example.com/tdd',
    gaps: ['계획 승인 단계 없음', 'Error handling 미흡', '문서화 부족'],
    suggestions: ['계획 단계 추가'],
    verdict: 'partial',
    created_at: '2026-04-20T00:00:00Z',
    gap_decisions: [
      { index: 0, type: 'gap', decision: 'adopt', issue_number: 42 },
      { index: 1, type: 'gap', decision: 'skip' },
      { index: 2, type: 'gap', decision: 'pending' },
    ],
  },

  { id: 2, skill: 'git-guard-claude', date: '2026-04-19', article_title: 'Git Workflow', article_url: 'https://example.com/git', gaps: [], suggestions: [], verdict: 'pass', created_at: '2026-04-19T00:00:00Z' },
];

const MOCK_LOGS = [
  { date: '2026-04-08', summary: 'Implemented harness-lab handoff flow' },
  { date: '2026-04-07', summary: 'Documented daily blueprint snapshot' },
];

const MOCK_LOG_CONTENT = `# Harness Lab - 2026-04-08

## Work Summary
Implemented harness-lab handoff flow

## Blockers
- Missing copy affordance

## Next Action
- Add prompt copy button

## Next Prompt
Continue the harness session and wire the prompt copy action.`;

const MOCK_BLUEPRINTS = [
  { skill: 'tdd-guard-claude', entry_count: 5, latest: { change: 'Added coverage threshold enforcement', date: '2026-04-08' } },
  { skill: 'git-guard-claude', entry_count: 3, latest: { change: 'Improved branch naming validation', date: '2026-04-07' } },
];

const MOCK_BLUEPRINT_HISTORY = {
  skill: 'tdd-guard-claude',
  entries: [
    { date: '2026-04-08', change: 'Added coverage threshold enforcement', reason: 'Coverage below 80%', issues: [], articles: [] },
    { date: '2026-04-01', change: 'Initial TDD policy', reason: 'Project kickoff', issues: [], articles: [] },
  ],
};

const MOCK_ANALYSIS_LIST = [
  { id: 1, date: '2026-04-13', branch: 'feature/2-reject-rate-tracking', git: { commit_count: 3 } },
];

const MOCK_ANALYSIS_REPORT = {
  id: 1,
  date: '2026-04-13',
  branch: 'feature/2-reject-rate-tracking',
  started_at: '2026-04-13T09:00:00Z',
  ended_at: '2026-04-13T11:00:00Z',
  git: { commit_count: 3, files_changed: 5, insertions: 80, deletions: 20, commits: [] },
  pr: null,
  quality: {
    security_guard: 'PASS',
    test_file_ratio: 0.4,
    tokens: { input: 1000, output: 300, cache_read: 5000, cache_creation: 200, total: 6500 },
    skill_invocations: { 'code-reviewer': 2, 'security-guard': 1 },
    reject_rates: {
      'code-reviewer': { runs: 2, reject: 1, rate: 0.5 },
      'security-guard': { runs: 1, reject: 0, rate: 0.0 },
    },
    efficiency: {
      guard_invocations_per_loc: 0.03,
      total_invocations_per_loc: 0.04,
      baseline_avg: 0.02,
      overhead_flag: true,
    },
  },
};

function seedMocks() {
  mockFetchHarnessLogs.mockResolvedValue({ logs: MOCK_LOGS });
  mockFetchHarnessBlueprints.mockResolvedValue({ skills: MOCK_BLUEPRINTS });
  mockFetchHarnessLog.mockResolvedValue({ date: '2026-04-08', content: MOCK_LOG_CONTENT });

  mockFetchHarnessBlueprintBySkill.mockResolvedValue(MOCK_BLUEPRINT_HISTORY);
  mockFetchHarnessAnalyses.mockResolvedValue({ reports: MOCK_ANALYSIS_LIST });
  mockFetchHarnessAnalysis.mockResolvedValue(MOCK_ANALYSIS_REPORT);
  mockFetchHarnessReferences.mockResolvedValue({ references: [] });
  mockDeleteHarnessReference.mockResolvedValue({});
  mockFetchHarnessEvaluations.mockResolvedValue({ evaluations: [] });
  mockFetchAllHarnessEvaluations.mockResolvedValue({ evaluations: MOCK_EVALUATIONS });
  mockPatchHarnessEvaluation.mockResolvedValue({ id: 3, gap_decisions: [{ index: 0, type: 'gap', decision: 'adopt' }] });
  mockDeleteHarnessEvaluation.mockResolvedValue({ ok: true });

}

function renderPage() {
  return render(<HarnessLabPage />);
}

describe('HarnessLabPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('\uC624\uB298 \uC778\uACC4 \uCE74\uB4DC\uAC00 \uB80C\uB354\uB9C1\uB41C\uB2E4', async () => {
    renderPage();
    expect(screen.getByText(KR.todayHandoff)).toBeInTheDocument();
    expect(await screen.findAllByText('Implemented harness-lab handoff flow')).toHaveLength(2);
    expect(screen.getByRole('button', { name: KR.copyNextPrompt })).toBeInTheDocument();
  });

  it('\uC624\uB298 \uC778\uACC4 \uCE74\uB4DC\uC5D0\uC11C \uCD5C\uC2E0 \uB85C\uADF8\uB97C \uC5F4 \uC218 \uC788\uB2E4', async () => {
    renderPage();
    await screen.findAllByText('Implemented harness-lab handoff flow');
    fireEvent.click(screen.getByRole('button', { name: KR.openTodayLog }));
    await waitFor(() => expect(mockFetchHarnessLog).toHaveBeenCalledWith('2026-04-08'));
    expect(await screen.findByTestId('markdown-viewer')).toHaveTextContent('Harness Lab - 2026-04-08');
  });

  it('\uB85C\uADF8 \uC561\uC158 \uBC14\uC5D0\uC11C \uD504\uB86C\uD504\uD2B8\uB97C \uBCF5\uC0AC\uD560 \uC218 \uC788\uB2E4', async () => {
    renderPage();
    await screen.findByText('2026-04-08');
    fireEvent.click(screen.getByText('2026-04-08'));
    await screen.findByRole('button', { name: KR.copyPrompt });
    fireEvent.click(screen.getByRole('button', { name: KR.copyPrompt }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Continue the harness session and wire the prompt copy action.'));
    expect(screen.getByText(KR.copiedNextPrompt)).toBeInTheDocument();
  });

  it('\uB85C\uADF8\uAC00 \uC5C6\uC744 \uB54C \uD55C\uAD6D\uC5B4 \uBE48 \uC0C1\uD0DC \uC548\uB0B4\uB97C \uBCF4\uC5EC\uC900\uB2E4', async () => {
    mockFetchHarnessLogs.mockResolvedValue({ logs: [] });
    mockFetchHarnessBlueprints.mockResolvedValue({ blueprints: [] });
    renderPage();
    expect(await screen.findByText(KR.noWrapups)).toBeInTheDocument();
    expect(screen.getByText(KR.runHarnessLog)).toBeInTheDocument();
  });

  it('\uC2DC\uBC94\uC6B4\uD589 \uD0ED\uC5D0\uC11C \uB9AC\uD3EC\uD2B8 \uD074\uB9AD \uC2DC efficiency \uC139\uC158\uACFC OVERHEAD \uBC30\uC9C0\uAC00 \uB80C\uB354\uB9C1\uB41C\uB2E4', async () => {
    renderPage();
    fireEvent.click(screen.getByText('시범운행'));
    const reportBtn = await screen.findByRole('button', { name: /2026-04-13/ });
    fireEvent.click(reportBtn);
    await waitFor(() => expect(mockFetchHarnessAnalysis).toHaveBeenCalledWith(1));
    expect(await screen.findByText('OVERHEAD')).toBeInTheDocument();
    expect(screen.getByText('0.03')).toBeInTheDocument();
    expect(screen.getByText('baseline avg: 0.02')).toBeInTheDocument();
  });

  it('\uC2DC\uBC94\uC6B4\uD589 \uB9AC\uD3EC\uD2B8\uC5D0\uC11C reject_rates\uAC00 \uB80C\uB354\uB9C1\uB41C\uB2E4', async () => {
    renderPage();
    fireEvent.click(screen.getByText('시범운행'));
    const reportBtn = await screen.findByRole('button', { name: /2026-04-13/ });
    fireEvent.click(reportBtn);
    await waitFor(() => expect(mockFetchHarnessAnalysis).toHaveBeenCalledWith(1));
    expect(await screen.findByText(/1\/2 REJECT/)).toBeInTheDocument();
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });

  it('\uC2A4\uD0AC \uAC1C\uC120\uC774\uB825 \uD0ED\uC5D0\uC11C \uC2A4\uD0AC \uBAA9\uB85D\uC774 \uB80C\uB354\uB9C1\uB41C\uB2E4', async () => {
    renderPage();

    const tabs = screen.getAllByText(KR.blueprintTab);
    fireEvent.click(tabs[tabs.length - 1]);
    expect(await screen.findByText('tdd-guard-claude')).toBeInTheDocument();
    expect(screen.getAllByText('git-guard-claude').length).toBeGreaterThan(0);

  });

  it('\uC2A4\uD0AC \uAC1C\uC120\uC774\uB825 \uC2A4\uD0AC \uD074\uB9AD \uC2DC fetchHarnessBlueprintBySkill\uC774 \uD638\uCD9C\uB41C\uB2E4', async () => {
    renderPage();

    const tabs = screen.getAllByText(KR.blueprintTab);
    fireEvent.click(tabs[tabs.length - 1]);
    const skillBtn = await screen.findByRole('button', { name: /tdd-guard-claude/ });
    fireEvent.click(skillBtn);
    await waitFor(() => expect(mockFetchHarnessBlueprintBySkill).toHaveBeenCalledWith('tdd-guard-claude'));

  });

  it('분석 탭에서 리포트 선택 시 reject_rates를 렌더링한다', async () => {
    renderPage();
    fireEvent.click(screen.getByText('시범운행'));
    const reportBtn = await screen.findByText('2026-04-13');
    fireEvent.click(reportBtn);
    await waitFor(() => expect(mockFetchHarnessAnalysis).toHaveBeenCalledWith(1));
    expect(await screen.findByText('REJECT 비율')).toBeInTheDocument();
    expect(screen.getAllByText('code-reviewer').length).toBeGreaterThan(0);
    expect(screen.getAllByText('security-guard').length).toBeGreaterThan(0);
  });

  it('REJECT가 있는 스킬은 비율을 표시하고 REJECT가 없는 스킬은 0%를 표시한다', async () => {
    renderPage();
    fireEvent.click(screen.getByText('시범운행'));
    await screen.findByText('2026-04-13');
    fireEvent.click(screen.getByText('2026-04-13'));
    await screen.findByText('REJECT 비율');
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText(/1\/2 REJECT/)).toBeInTheDocument();
    expect(screen.getByText(/0\/1 REJECT/)).toBeInTheDocument();
  });

  describe('평가 이력 탭', () => {
    it('평가 이력 탭이 렌더링된다', async () => {
      renderPage();
      fireEvent.click(screen.getByText('평가 이력'));
      expect(await screen.findByText(MOCK_EVALUATIONS[0].article_title)).toBeInTheDocument();
    });

    it('스킬 필터 버튼이 렌더링된다', async () => {
      renderPage();
      fireEvent.click(screen.getByText('평가 이력'));
      expect(await screen.findByRole('button', { name: 'tdd-guard-claude' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'git-guard-claude' })).toBeInTheDocument();
    });

    it('평가 없으면 빈 상태 메시지가 표시된다', async () => {
      mockFetchAllHarnessEvaluations.mockResolvedValue({ evaluations: [] });
      renderPage();
      fireEvent.click(screen.getByText('평가 이력'));
      expect(await screen.findByText('저장된 평가 이력이 없습니다.')).toBeInTheDocument();
    });

    it('스킬 필터 클릭 시 해당 스킬만 표시된다', async () => {
      renderPage();
      fireEvent.click(screen.getByText('평가 이력'));
      await screen.findByRole('button', { name: 'tdd-guard-claude' });
      fireEvent.click(screen.getByRole('button', { name: 'tdd-guard-claude' }));
      expect(await screen.findByText('TDD Best Practices')).toBeInTheDocument();
      expect(screen.queryByText('Git Workflow')).not.toBeInTheDocument();
    });

    it('adopt 결정이 있는 gap은 초록 뱃지(adopt)를 렌더링한다', async () => {
      renderPage();
      fireEvent.click(screen.getByText('평가 이력'));
      expect(await screen.findByText('TDD Best Practices')).toBeInTheDocument();
      const adoptBadges = screen.getAllByText('adopt');
      expect(adoptBadges.length).toBeGreaterThan(0);
      expect(adoptBadges[0]).toHaveClass('bg-green-100');
    });

    it('skip 결정이 있는 gap은 회색 뱃지(skip)를 렌더링한다', async () => {
      renderPage();
      fireEvent.click(screen.getByText('평가 이력'));
      expect(await screen.findByText('TDD Best Practices')).toBeInTheDocument();
      const skipBadges = screen.getAllByText('skip');
      expect(skipBadges.length).toBeGreaterThan(0);
      expect(skipBadges[0]).toHaveClass('bg-gray-100');
    });

    it('pending 결정이 있는 gap은 노랑 뱃지(pending)를 렌더링한다', async () => {
      renderPage();
      fireEvent.click(screen.getByText('평가 이력'));
      expect(await screen.findByText('TDD Best Practices')).toBeInTheDocument();
      const pendingBadges = screen.getAllByText('pending');
      expect(pendingBadges.length).toBeGreaterThan(0);
      expect(pendingBadges[0]).toHaveClass('bg-yellow-100');
    });

    it('gap에 결정이 없으면 adopt/skip 버튼이 렌더링된다', async () => {
      mockFetchAllHarnessEvaluations.mockResolvedValue({
        evaluations: [{ id: 3, skill: 'tdd-guard-claude', date: '2026-04-22', article_title: 'No Decision Yet', article_url: 'https://example.com/nd', gaps: ['테스트 커버리지 부족'], suggestions: [], verdict: 'partial', gap_decisions: [] }]
      });
      renderPage();
      fireEvent.click(screen.getByText('평가 이력'));
      expect(await screen.findByText('No Decision Yet')).toBeInTheDocument();
      const adoptButtons = screen.getAllByRole('button', { name: 'adopt' });
      const skipButtons = screen.getAllByRole('button', { name: 'skip' });
      expect(adoptButtons).toHaveLength(1);
      expect(skipButtons).toHaveLength(1);
    });

    it('adopt 버튼 클릭 시 patchHarnessEvaluation이 올바른 인자로 호출된다', async () => {
      mockFetchAllHarnessEvaluations.mockResolvedValue({
        evaluations: [{ id: 3, skill: 'tdd-guard-claude', date: '2026-04-22', article_title: 'No Decision Yet', article_url: 'https://example.com/nd', gaps: ['테스트 커버리지 부족'], suggestions: [], verdict: 'partial', gap_decisions: [] }]
      });
      renderPage();
      fireEvent.click(screen.getByText('평가 이력'));
      expect(await screen.findByText('No Decision Yet')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'adopt' }));
      await waitFor(() => expect(mockPatchHarnessEvaluation).toHaveBeenCalledWith(3, [{ index: 0, type: 'gap', decision: 'adopt' }]));
    });

    it('삭제(✕) 버튼 클릭 시 deleteHarnessEvaluation이 호출되고 카드가 사라진다', async () => {
      mockFetchAllHarnessEvaluations.mockResolvedValue({
        evaluations: [{ id: 3, skill: 'tdd-guard-claude', date: '2026-04-22', article_title: 'No Decision Yet', article_url: 'https://example.com/nd', gaps: ['테스트 커버리지 부족'], suggestions: [], verdict: 'partial', gap_decisions: [] }]
      });
      renderPage();
      fireEvent.click(screen.getByText('평가 이력'));
      expect(await screen.findByText('No Decision Yet')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '평가 삭제' }));
      await waitFor(() => expect(mockDeleteHarnessEvaluation).toHaveBeenCalledWith(3));
      expect(screen.queryByText('No Decision Yet')).not.toBeInTheDocument();
    });

  });
});
