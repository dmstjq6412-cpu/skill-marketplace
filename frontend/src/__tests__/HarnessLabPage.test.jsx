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
  blueprintTab: '\uBE14\uB8E8\uD504\uB9B0\uD2B8',
  coverageDiff: '\uCEE4\uBC84\uB9AC\uC9C0 +15%',
  changedOne: '\uBCC0\uACBD 1',
  openRelatedViz: '\uC5F0\uACB0\uB41C \uC2DC\uAC01\uD654 \uC5F4\uAE30',
  vizHint: '\uBE0C\uB79C\uCE58 \uC804\uB7B5, \uB9AC\uBDF0 \uD750\uB984, git guard \uC790\uB3D9\uD654 \uC778\uACC4\uB97C \uB2E4\uB8EC \uB0A0\uC5D0 \uD655\uC778\uD558\uAE30 \uC88B\uC2B5\uB2C8\uB2E4.',
};

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
  { date: '2026-04-08', coverage: { current: 45 }, session_summary: 'Implemented harness-lab handoff flow' },
  { date: '2026-04-07', coverage: { current: 30 }, session_summary: 'Documented blueprint baseline' },
];

const MOCK_BLUEPRINT = {
  date: '2026-04-08',
  skills: [
    { name: 'tdd-guard-claude', status: 'DONE', version: 'v2.0.0' },
    { name: 'git-guard-claude', status: 'IN_PROGRESS', version: 'v1.0.0' },
  ],
  coverage: { current: 45, description: 'Current' },
  pipeline: 'tdd -> code-review -> git-guard',
  session_summary: 'Implemented harness-lab handoff flow',
};

const MOCK_ANALYSIS_LIST = [
  { id: 'report-2026-04-08', date: '2026-04-08', branch: 'feature/3-efficiency', commit_count: 4 },
];

const MOCK_ANALYSIS_REPORT = {
  id: 'report-2026-04-08',
  date: '2026-04-08',
  branch: 'feature/3-efficiency',
  started_at: '2026-04-08T09:00:00Z',
  ended_at: '2026-04-08T17:00:00Z',
  git: { start_commit: 'abc1234', end_commit: 'def5678', commit_count: 4, commits: [], files_changed: 6, insertions: 120, deletions: 40 },
  pr: null,
  quality: {
    security_guard: 'PASS',
    test_file_ratio: 0.33,
    tokens: { input: 1000, output: 300, cache_read: 20000, cache_creation: 500, total: 21800 },
    skill_invocations: { 'tdd-guard-claude': 3, 'code-reviewer': 2 },
    reject_rates: {
      'code-reviewer': { runs: 2, reject: 1, rate: 0.5 },
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
  mockFetchHarnessBlueprintBySkill.mockResolvedValue(MOCK_BLUEPRINT);
  mockFetchHarnessAnalyses.mockResolvedValue({ reports: MOCK_ANALYSIS_LIST });
  mockFetchHarnessAnalysis.mockResolvedValue(MOCK_ANALYSIS_REPORT);
  mockFetchHarnessReferences.mockResolvedValue({ references: [] });
  mockDeleteHarnessReference.mockResolvedValue({});
  mockFetchHarnessEvaluations.mockResolvedValue({ evaluations: [] });
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
    expect(await screen.findAllByText('Implemented harness-lab handoff flow')).toHaveLength(3);
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

  it('\uBE14\uB8E8\uD504\uB9B0\uD2B8 diff\uB97C \uAE30\uBCF8 \uB0A0\uC9DC\uB85C \uBD88\uB7EC\uC624\uACE0 \uC694\uC57D \uCE69\uC744 \uBCF4\uC5EC\uC900\uB2E4', async () => {
    renderPage();
    fireEvent.click(screen.getByText(KR.blueprintTab));
    await waitFor(() => expect(mockFetchHarnessBlueprintDiff).toHaveBeenCalledWith('2026-04-07', '2026-04-08'));
    expect(await screen.findByText(KR.coverageDiff)).toBeInTheDocument();
    expect(screen.getByText(KR.changedOne)).toBeInTheDocument();
  });

  it('\uBE14\uB8E8\uD504\uB9B0\uD2B8 \uC0C1\uC138\uC5D0\uC11C \uC5F0\uACB0\uB41C \uC2DC\uAC01\uD654\uB97C \uC5F4 \uC218 \uC788\uB2E4', async () => {
    renderPage();
    fireEvent.click(screen.getByText(KR.blueprintTab));
    const blueprintButtons = await screen.findAllByRole('button', { name: /2026-04-08/ });
    fireEvent.click(blueprintButtons[0]);
    await screen.findByRole('button', { name: KR.openRelatedViz });
    fireEvent.click(screen.getByRole('button', { name: KR.openRelatedViz }));
    expect(await screen.findByTitle('git-guard')).toBeInTheDocument();
    expect(screen.getAllByText(KR.vizHint).length).toBeGreaterThan(0);
  });
});
