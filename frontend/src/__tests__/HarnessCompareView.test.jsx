// HarnessCompareView — 다수의 harness 분석 리포트를 받아 토큰 구성 막대그래프,
// tokens/LOC 꺾은선 추이, REJECT 강조, policy 라벨, 빈 상태·로딩 상태를 렌더링하는 컴포넌트 테스트

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Import component AFTER mocks (Red 단계 — 파일 미존재, 실패 정상)
const { default: HarnessCompareView } = await import('../components/HarnessCompareView');

// --- Fixtures ---

const REPORT_NO_REJECT = {
  date: '2026-04-21',
  quality: {
    tokens: { total: 5767480 },
    token_phases: {
      baseline: 148780,
      'tdd-guard-claude': 1268375,
      'git-guard-claude': 2898840,
      'security-guard': 1108573,
      'harness-analysis': 342912,
    },
    reject_rates: {
      'security-guard': { runs: 1, reject: 0, rate: 0 },
    },
    efficiency: {
      loc: 28,
      guard_invocations_per_loc: 0.11,
    },
  },
  policy: 'tdd-guard v1.7.1 + CHECKPOINT',
};

const REPORT_WITH_REJECT = {
  date: '2026-04-28',
  quality: {
    tokens: { total: 3200000 },
    token_phases: {
      baseline: 100000,
      'tdd-guard-claude': 800000,
      'git-guard-claude': 1500000,
      'security-guard': 600000,
      'harness-analysis': 200000,
    },
    reject_rates: {
      'security-guard': { runs: 2, reject: 1, rate: 0.5 },
      'tdd-guard-claude': { runs: 3, reject: 2, rate: 0.67 },
    },
    efficiency: {
      loc: 45,
      guard_invocations_per_loc: 0.22,
    },
  },
  policy: 'tdd-guard v1.8.0',
};

const REPORT_NO_POLICY = {
  date: '2026-05-01',
  quality: {
    tokens: { total: 2000000 },
    token_phases: {
      baseline: 50000,
      'tdd-guard-claude': 500000,
      'git-guard-claude': 900000,
      'security-guard': 400000,
      'harness-analysis': 150000,
    },
    reject_rates: {
      'security-guard': { runs: 1, reject: 0, rate: 0 },
    },
    efficiency: {
      loc: 20,
      guard_invocations_per_loc: 0.05,
    },
  },
  // policy 필드 없음
};

function renderView(props = {}) {
  return render(<HarnessCompareView reports={[]} loading={false} {...props} />);
}

// ============================================================
// 빈 상태 / 로딩 상태
// ============================================================
describe('HarnessCompareView — 빈 상태 / 로딩 상태', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('리포트가 없을 때 — 비어있음을 알리는 메시지를 보여준다', () => {
    // 데이터 없이 빈 배열 전달 시 사용자에게 안내 메시지가 필요하다
    renderView({ reports: [] });
    expect(
      screen.getByText(/비교할 리포트가 없습니다|no reports|리포트 없음/i)
    ).toBeInTheDocument();
  });

  it('loading이 true일 때 — 로딩 인디케이터를 보여준다', () => {
    // 데이터 로딩 중임을 사용자에게 시각적으로 알려야 한다
    renderView({ loading: true, reports: [] });
    expect(
      screen.getByText(/로딩|loading/i) ||
      document.querySelector('[data-testid="loading"]') ||
      document.querySelector('[aria-busy="true"]')
    ).toBeTruthy();
  });
});

// ============================================================
// 날짜 라벨 렌더링
// ============================================================
describe('HarnessCompareView — 날짜 라벨', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('run별 날짜 라벨이 렌더링된다 — 각 run의 date가 표시됨', () => {
    // 각 리포트의 날짜는 그래프 축 라벨 또는 카드 헤더로 표시되어야 한다
    const reports = [REPORT_NO_REJECT, REPORT_WITH_REJECT];
    renderView({ reports });
    reports.forEach(r => {
      expect(screen.getByText(r.date)).toBeInTheDocument();
    });
  });
});

// ============================================================
// token_phases 막대그래프
// ============================================================
describe('HarnessCompareView — token_phases 스택 막대그래프', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('token_phases 구성이 막대로 렌더링된다 — baseline, tdd-guard-claude 등 phase별 bar 존재', () => {
    // 각 phase를 구분할 수 있는 막대(bar) 요소가 존재해야 가독성을 제공한다
    renderView({ reports: [REPORT_NO_REJECT] });

    const phases = [
      'baseline',
      'tdd-guard-claude',
      'git-guard-claude',
      'security-guard',
      'harness-analysis',
    ];

    phases.forEach((phase) => {
      // data-phase 속성 또는 aria-label 또는 텍스트로 phase 식별
      const el =
        document.querySelector(`[data-phase="${phase}"]`) ||
        document.querySelector(`[aria-label*="${phase}"]`) ||
        screen.queryByText(new RegExp(phase, 'i'));
      expect(el).not.toBeNull();
    });
  });
});

// ============================================================
// REJECT 강조
// ============================================================
describe('HarnessCompareView — REJECT 강조 표시', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reject > 0인 run은 reject 강조 표시가 있다', () => {
    // reject가 발생한 run은 즉시 눈에 띄어야 품질 이상을 빠르게 감지할 수 있다
    renderView({ reports: [REPORT_WITH_REJECT] });

    const badge =
      document.querySelector('[data-testid="reject-badge"]') ||
      document.querySelector('[data-testid*="reject"]') ||
      screen.queryByText(/reject/i);
    expect(badge).not.toBeNull();
  });

  it('reject가 0이거나 없는 run은 reject 강조 표시가 없다', () => {
    // 정상 run에는 불필요한 경고 표시가 없어야 신호 대 잡음비를 유지할 수 있다
    renderView({ reports: [REPORT_NO_REJECT] });

    const badge = document.querySelector('[data-testid="reject-badge"]');
    expect(badge).toBeNull();
  });
});

// ============================================================
// policy 라벨
// ============================================================
describe('HarnessCompareView — policy 라벨', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('policy 라벨이 있으면 표시된다', () => {
    // 어떤 정책 버전으로 수행된 run인지 맥락을 제공한다
    renderView({ reports: [REPORT_NO_REJECT] });
    expect(screen.getByText(/tdd-guard v1\.7\.1 \+ CHECKPOINT/i)).toBeInTheDocument();
  });

  it('policy 라벨이 없으면 표시되지 않는다', () => {
    // policy 없는 run에서 빈 라벨이 렌더링되어 레이아웃이 깨지면 안 된다
    renderView({ reports: [REPORT_NO_POLICY] });
    expect(screen.queryByText(/tdd-guard v1\.7\.1/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/tdd-guard v1\.8\.0/i)).not.toBeInTheDocument();
  });
});

// ============================================================
// tokens/LOC 꺾은선 그래프 데이터 포인트
// ============================================================
describe('HarnessCompareView — tokens/LOC 꺾은선 그래프', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tokens/LOC 꺾은선 데이터 포인트가 runs 수만큼 렌더링된다', () => {
    // 추이 파악을 위해 모든 run의 효율 지표가 그래프에 나타나야 한다
    const reports = [REPORT_NO_REJECT, REPORT_WITH_REJECT, REPORT_NO_POLICY];
    renderView({ reports });

    // data-testid="line-point" 또는 동일한 식별자 사용
    const points = document.querySelectorAll('[data-testid="line-point"]');
    expect(points.length).toBe(reports.length);
  });
});
