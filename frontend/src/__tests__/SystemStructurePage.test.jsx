// SystemStructurePage — API에서 받은 시스템 구조(도메인·라우트)를 렌더링하는 페이지 테스트
// Red 단계: 제품 코드 미존재, 실패 정상

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// --- Mock: api/client.js ---
vi.mock('../api/client', () => ({
  fetchSystemMap: vi.fn(),
}));

import { fetchSystemMap } from '../api/client';

// --- Fixtures ---
const SYSTEM_MAP = {
  generated_at: '2026-05-21',
  domains: [
    {
      name: 'harness',
      routes: [
        {
          method: 'GET',
          path: '/logs',
          description: 'GET /api/harness/logs 로그 목록 반환',
          auth: false,
          logic: 'harness.js:9',
          client_fn: { name: 'fetchHarnessLogs', line: 32 },
          test_file: 'backend/tests/routes/harness.test.js',
          req_slug: 'system-map-view',
        },
        {
          method: 'POST',
          path: '/logs',
          description: '',
          auth: false,
          logic: 'harness.js:45',
          client_fn: null,
          test_file: 'backend/tests/routes/harness.test.js',
          req_slug: null,
        },
        {
          method: 'DELETE',
          path: '/evaluations/:id',
          description: '평가 삭제',
          auth: true,
          logic: 'harness.js:391',
          client_fn: { name: 'deleteHarnessEvaluation', line: 67 },
          test_file: 'backend/tests/routes/harness.test.js',
          req_slug: null,
        },
      ],
    },
    {
      name: 'auth',
      routes: [
        {
          method: 'GET',
          path: '/me',
          description: '현재 사용자 정보',
          auth: true,
          logic: 'auth.js:146',
          client_fn: { name: 'fetchMe', line: 70 },
          test_file: 'backend/tests/routes/auth.test.js',
          req_slug: null,
        },
      ],
    },
  ],
  features: [
    {
      name: 'harness-log',
      desc: '하네스 세션 로그를 DB에 저장하고 조회한다',
      flow: 'GET /logs → DB 조회 → 목록 반환',
      req_slug: 'system-map-view',
      routes: [
        { method: 'GET', path: '/logs', auth: false },
        { method: 'POST', path: '/logs', auth: false },
      ],
      tests: ['로그 목록을 반환한다', '로그 없으면 빈 배열 반환'],
    },
    {
      name: 'harness-eval',
      desc: '평가 항목을 삭제한다',
      flow: 'DELETE /evaluations/:id → 인증 → DB 삭제',
      req_slug: null,
      routes: [
        { method: 'DELETE', path: '/evaluations/:id', auth: true },
      ],
      tests: ['평가를 삭제한다'],
    },
  ],
};

// Import component AFTER mocks (Red 단계 — 파일 미존재, 실패 정상)
const { default: SystemStructurePage } = await import('../pages/SystemStructurePage');

// ============================================================
// 로딩 / 에러 상태
// ============================================================
describe('SystemStructurePage — 로딩/에러 상태', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchSystemMap이 로딩 중일 때 로딩 인디케이터를 보여준다', async () => {
    // 데이터 fetch가 완료되기 전에 사용자에게 로딩 상태를 시각적으로 알려야 한다
    fetchSystemMap.mockReturnValue(new Promise(() => {})); // 영원히 pending

    render(<SystemStructurePage />);

    expect(
      screen.queryByText(/로딩|loading/i) ||
        document.querySelector('[data-testid="loading"]') ||
        document.querySelector('[aria-busy="true"]')
    ).not.toBeNull();
  });

  it('fetchSystemMap이 실패하면 에러 메시지를 보여준다', async () => {
    // fetch 실패 시 사용자에게 오류 상황을 알리는 메시지가 표시되어야 한다
    fetchSystemMap.mockRejectedValue(new Error('Network Error'));

    render(<SystemStructurePage />);

    await waitFor(() => {
      expect(
        screen.queryByText(/오류|에러|error|실패|failed/i) ||
          document.querySelector('[data-testid="error"]')
      ).not.toBeNull();
    });
  });
});

// ============================================================
// 도메인 그룹 렌더링 (AC-1)
// ============================================================
describe('SystemStructurePage — 도메인 그룹 렌더링 (AC-1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSystemMap.mockResolvedValue(SYSTEM_MAP);
  });

  it('fixture의 도메인 수만큼 섹션 헤더가 렌더링된다', async () => {
    // N개 도메인이면 N개 섹션이 있어야 그룹화 로직이 올바른 것이다
    render(<SystemStructurePage />);

    await waitFor(() => {
      const headings = screen.getAllByRole('heading', { level: 2 });
      expect(headings.length).toBe(SYSTEM_MAP.domains.length);
    });
  });

  it('각 도메인 이름이 섹션 헤더에 포함된다', async () => {
    // 헤더에 도메인 이름이 없으면 어떤 섹션인지 식별할 수 없다
    render(<SystemStructurePage />);

    await waitFor(() => {
      const headings = screen.getAllByRole('heading');
      SYSTEM_MAP.domains.forEach(domain => {
        expect(headings.some(h => h.textContent.includes(domain.name))).toBe(true);
      });
    });
  });
});

// ============================================================
// 라우트 정보 렌더링 (AC-2)
// ============================================================
describe('SystemStructurePage — 라우트 정보 렌더링 (AC-2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSystemMap.mockResolvedValue(SYSTEM_MAP);
  });

  it('모든 라우트의 method가 표시된다', async () => {
    // HTTP 메서드는 라우트의 핵심 식별자로 반드시 표시되어야 한다
    render(<SystemStructurePage />);

    const allRoutes = SYSTEM_MAP.domains.flatMap(d => d.routes);
    const methods = [...new Set(allRoutes.map(r => r.method))];

    await waitFor(() => {
      methods.forEach(method => {
        expect(screen.getAllByText(method).length).toBeGreaterThan(0);
      });
    });
  });

  it('모든 라우트의 path가 표시된다', async () => {
    // 라우트 경로는 엔드포인트를 특정하는 핵심 정보로 반드시 표시되어야 한다
    render(<SystemStructurePage />);

    const allRoutes = SYSTEM_MAP.domains.flatMap(d => d.routes);
    await waitFor(() => {
      allRoutes.forEach(route => {
        expect(screen.getAllByText(route.path).length).toBeGreaterThan(0);
      });
    });
  });

  it('description이 있는 라우트는 해당 설명이 표시된다', async () => {
    // description이 있는 라우트는 사람이 읽을 수 있는 설명을 제공해야 한다
    render(<SystemStructurePage />);

    const routesWithDesc = SYSTEM_MAP.domains
      .flatMap(d => d.routes)
      .filter(r => r.description);

    await waitFor(() => {
      routesWithDesc.forEach(route => {
        expect(screen.getByText(route.description)).toBeInTheDocument();
      });
    });
  });

  it('description이 없는 라우트는 "—"으로 표시된다', async () => {
    // description이 빈 문자열인 라우트는 빈 칸 대신 "—"을 표시해 가독성을 유지한다
    render(<SystemStructurePage />);

    const emptyDescCount = SYSTEM_MAP.domains
      .flatMap(d => d.routes)
      .filter(r => !r.description).length;

    await waitFor(() => {
      // client_fn null도 "—"이므로 emptyDescCount 이상
      expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(emptyDescCount);
    });
  });

  it('auth=true인 라우트 수만큼 🔒가 표시된다', async () => {
    // 인증 필요 라우트는 🔒 아이콘으로 즉시 식별할 수 있어야 한다
    render(<SystemStructurePage />);

    const authCount = SYSTEM_MAP.domains
      .flatMap(d => d.routes)
      .filter(r => r.auth).length;

    await waitFor(() => {
      expect(screen.getAllByText('🔒').length).toBe(authCount);
    });
  });

  it('auth=false인 라우트 수만큼 🔓가 표시된다', async () => {
    // 인증 불필요 라우트는 🔓 아이콘으로 구분하여 보안 구조를 한눈에 파악할 수 있어야 한다
    render(<SystemStructurePage />);

    const noAuthCount = SYSTEM_MAP.domains
      .flatMap(d => d.routes)
      .filter(r => !r.auth).length;

    await waitFor(() => {
      expect(screen.getAllByText('🔓').length).toBe(noAuthCount);
    });
  });

  it('test_file이 있는 라우트는 해당 파일명이 표시된다', async () => {
    // 연결된 테스트 파일 경로를 표시해 커버리지 추적을 돕는다
    render(<SystemStructurePage />);

    const testFiles = [...new Set(
      SYSTEM_MAP.domains.flatMap(d => d.routes).map(r => r.test_file).filter(Boolean)
    )];

    await waitFor(() => {
      testFiles.forEach(file => {
        expect(screen.getAllByText(file).length).toBeGreaterThan(0);
      });
    });
  });

  it('client_fn이 있는 라우트는 함수명이 표시된다', async () => {
    // 클라이언트 함수명을 표시해 프론트-백 연결 지점을 추적할 수 있어야 한다
    render(<SystemStructurePage />);

    const fnNames = SYSTEM_MAP.domains
      .flatMap(d => d.routes)
      .filter(r => r.client_fn)
      .map(r => r.client_fn.name);

    await waitFor(() => {
      fnNames.forEach(name => {
        expect(screen.getByText(name)).toBeInTheDocument();
      });
    });
  });

  it('client_fn이 null인 라우트는 "—"으로 표시된다', async () => {
    // client_fn이 없는 라우트는 빈 칸 대신 "—"을 표시해 의도적으로 없음을 명시한다
    render(<SystemStructurePage />);

    const nullFnCount = SYSTEM_MAP.domains
      .flatMap(d => d.routes)
      .filter(r => !r.client_fn).length;

    await waitFor(() => {
      expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(nullFnCount);
    });
  });
});

// ============================================================
// REQ 뱃지 (AC-3, AC-4)
// ============================================================
describe('SystemStructurePage — REQ 뱃지 (AC-3, AC-4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSystemMap.mockResolvedValue(SYSTEM_MAP);
  });

  it('req_slug가 있는 라우트에는 REQ 뱃지가 표시된다', async () => {
    // req_slug가 있는 라우트는 REQ 뱃지로 요구사항 연결을 시각적으로 표시해야 한다
    render(<SystemStructurePage />);

    await waitFor(() => {
      // GET /logs — req_slug: 'system-map-view'
      const reqBadge =
        document.querySelector('[data-testid="req-badge"]') ||
        screen.queryByText(/REQ|system-map-view/i);
      expect(reqBadge).not.toBeNull();
    });
  });

  it('req_slug가 null인 라우트에는 "REQ 없음" 상태가 표시된다', async () => {
    // req_slug가 없는 라우트는 "REQ 없음" 또는 동등한 표시로 요구사항 미연결을 명시한다
    render(<SystemStructurePage />);

    await waitFor(() => {
      // POST /logs, DELETE /evaluations/:id, GET /me — req_slug: null
      const noReqEl =
        document.querySelector('[data-testid="no-req"]') ||
        screen.queryByText(/REQ 없음|no req/i);
      expect(noReqEl).not.toBeNull();
    });
  });
});

// ============================================================
// 탭 전환 UI (TD-2: 기능 지도 / API 목록)
// ============================================================
describe('SystemStructurePage — 탭 전환 UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSystemMap.mockResolvedValue(SYSTEM_MAP);
  });

  it('기능 지도 탭과 API 목록 탭 버튼이 둘 다 렌더링된다 (TD-2)', async () => {
    // 두 관점(기능 지도 / API 목록)을 전환할 수 있는 탭 버튼이 있어야 한다
    render(<SystemStructurePage />);

    await waitFor(() => {
      const tabButtons = document.querySelectorAll('[role="tab"], button[data-tab]');
      expect(tabButtons.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('기본 탭은 기능 지도다 (TD-2)', async () => {
    // 페이지 진입 시 기능 지도 탭이 기본으로 활성화되어야 한다
    render(<SystemStructurePage />);

    await waitFor(() => {
      const activeTab =
        document.querySelector('[role="tab"][aria-selected="true"]') ||
        document.querySelector('[data-tab="feature-map"].active') ||
        document.querySelector('[data-tab="feature-map"][aria-current]');
      expect(activeTab).not.toBeNull();
    });
  });
});

// ============================================================
// 기능 지도 탭 — feature 카드 렌더링 (AC-1, AC-2, AC-3)
// ============================================================
describe('SystemStructurePage — 기능 지도 feature 카드', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSystemMap.mockResolvedValue(SYSTEM_MAP);
  });

  it('fixtures의 feature 수만큼 카드가 렌더링된다 (AC-1, AC-2)', async () => {
    // features 배열 항목 수와 렌더링된 카드 수가 일치해야 그룹핑 로직이 올바른 것이다
    render(<SystemStructurePage />);

    await waitFor(() => {
      const cards = document.querySelectorAll('[data-feature-card]');
      expect(cards.length).toBe(SYSTEM_MAP.features.length);
    });
  });

  it('각 feature 카드에 name이 표시된다 (AC-3)', async () => {
    // 카드 제목이 없으면 어떤 기능인지 파악할 수 없다
    render(<SystemStructurePage />);

    await waitFor(() => {
      SYSTEM_MAP.features.forEach(feature => {
        const cards = document.querySelectorAll('[data-feature-card]');
        const found = Array.from(cards).some(c => c.textContent.includes(feature.name));
        expect(found).toBe(true);
      });
    });
  });

  it('각 feature 카드에 desc가 표시된다 (AC-3)', async () => {
    // desc가 있는 feature는 설명이 카드에 노출되어야 한다
    render(<SystemStructurePage />);

    const featuresWithDesc = SYSTEM_MAP.features.filter(f => f.desc);
    await waitFor(() => {
      featuresWithDesc.forEach(feature => {
        const cards = document.querySelectorAll('[data-feature-card]');
        const found = Array.from(cards).some(c => c.textContent.includes(feature.desc));
        expect(found).toBe(true);
      });
    });
  });

  it('각 feature 카드에 포함 라우트 수가 표시된다 (AC-3)', async () => {
    // 라우트 수를 표시해 해당 기능의 규모를 카드 수준에서 파악할 수 있어야 한다
    render(<SystemStructurePage />);

    await waitFor(() => {
      SYSTEM_MAP.features.forEach(feature => {
        const routeCount = feature.routes.length;
        const cards = document.querySelectorAll('[data-feature-card]');
        const found = Array.from(cards).some(c =>
          c.textContent.includes(String(routeCount))
        );
        expect(found).toBe(true);
      });
    });
  });

  it('req_slug가 있는 feature 카드에는 REQ 뱃지가 표시된다 (AC-5)', async () => {
    // @req로 연결된 feature는 REQ 뱃지가 있어야 코드↔문서 추적이 가능하다
    render(<SystemStructurePage />);

    const featuresWithReq = SYSTEM_MAP.features.filter(f => f.req_slug);
    await waitFor(() => {
      featuresWithReq.forEach(feature => {
        const cards = document.querySelectorAll('[data-feature-card]');
        const card = Array.from(cards).find(c => c.textContent.includes(feature.name));
        expect(card).toBeDefined();
        const badge =
          card.querySelector('[data-testid="req-badge"]') ||
          card.querySelector('[data-req-badge]');
        expect(badge).not.toBeNull();
      });
    });
  });
});

// ============================================================
// 기능 지도 탭 — feature 카드 펼침 (AC-4, AC-9)
// ============================================================
describe('SystemStructurePage — feature 카드 펼침', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSystemMap.mockResolvedValue(SYSTEM_MAP);
  });

  it('카드를 펼치면 해당 feature의 라우트 수만큼 행이 표시된다 (AC-4)', async () => {
    // 펼쳤을 때 라우트 목록이 feature.routes 수와 일치해야 한다
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<SystemStructurePage />);

    await waitFor(() => {
      const cards = document.querySelectorAll('[data-feature-card]');
      expect(cards.length).toBeGreaterThan(0);
    });

    const firstFeature = SYSTEM_MAP.features[0];
    const cards = document.querySelectorAll('[data-feature-card]');
    const firstCard = Array.from(cards).find(c => c.textContent.includes(firstFeature.name));

    const toggle = firstCard.querySelector('[data-toggle], button');
    if (toggle) await user.click(toggle);

    await waitFor(() => {
      const routeRows = firstCard.querySelectorAll('[data-route-row]');
      expect(routeRows.length).toBe(firstFeature.routes.length);
    });
  });

  it('펼친 라우트 목록에 method·path·auth가 표시된다 (AC-4)', async () => {
    // 라우트 상세(method, path, auth)가 모두 표시되어야 엔드포인트를 식별할 수 있다
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<SystemStructurePage />);

    await waitFor(() => {
      const cards = document.querySelectorAll('[data-feature-card]');
      expect(cards.length).toBeGreaterThan(0);
    });

    const firstFeature = SYSTEM_MAP.features[0];
    const cards = document.querySelectorAll('[data-feature-card]');
    const firstCard = Array.from(cards).find(c => c.textContent.includes(firstFeature.name));

    const toggle = firstCard.querySelector('[data-toggle], button');
    if (toggle) await user.click(toggle);

    await waitFor(() => {
      firstFeature.routes.forEach(route => {
        expect(firstCard.textContent).toContain(route.method);
        expect(firstCard.textContent).toContain(route.path);
      });
    });
  });

  it('카드를 펼치면 해당 feature의 테스트 케이스 이름 목록이 표시된다 (AC-9)', async () => {
    // 테스트 케이스 이름이 표시되어야 "이 기능에 어떤 테스트가 있는가"를 파악할 수 있다
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<SystemStructurePage />);

    await waitFor(() => {
      const cards = document.querySelectorAll('[data-feature-card]');
      expect(cards.length).toBeGreaterThan(0);
    });

    const firstFeature = SYSTEM_MAP.features[0];
    const cards = document.querySelectorAll('[data-feature-card]');
    const firstCard = Array.from(cards).find(c => c.textContent.includes(firstFeature.name));

    const toggle = firstCard.querySelector('[data-toggle], button');
    if (toggle) await user.click(toggle);

    await waitFor(() => {
      firstFeature.tests.forEach(testName => {
        expect(firstCard.textContent).toContain(testName);
      });
    });
  });
});

// ============================================================
// API 목록 탭 회귀 방지 (AC-6, AC-8)
// ============================================================
describe('SystemStructurePage — API 목록 탭 회귀', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSystemMap.mockResolvedValue(SYSTEM_MAP);
  });

  it('API 목록 탭 전환 시 도메인 섹션이 표시된다 (AC-6)', async () => {
    // 탭 전환 후에도 기존 도메인·라우트 테이블이 정상 동작해야 한다
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<SystemStructurePage />);

    await waitFor(() => {
      const tabs = document.querySelectorAll('[role="tab"], button[data-tab]');
      expect(tabs.length).toBeGreaterThanOrEqual(2);
    });

    // API 목록 탭 클릭
    const apiTab =
      document.querySelector('[data-tab="api-list"]') ||
      Array.from(document.querySelectorAll('[role="tab"]')).find(t =>
        t.textContent.match(/API 목록|api/i)
      );
    if (apiTab) await user.click(apiTab);

    await waitFor(() => {
      const domainSections = document.querySelectorAll('[data-domain]');
      expect(domainSections.length).toBe(SYSTEM_MAP.domains.length);
    });
  });

  it('@feature 없는 라우트는 API 목록 탭에만 표시된다 (AC-8)', async () => {
    // @feature가 없는 라우트는 기능 지도 탭에서 보이지 않고 API 목록 탭에서만 보여야 한다
    // features에 속하지 않는 라우트(auth 도메인 전체 — fixture에서 features에 포함 안 됨)를 기준으로 검증
    const featureRoutes = SYSTEM_MAP.features.flatMap(f => f.routes.map(r => r.path));
    const allRoutes = SYSTEM_MAP.domains.flatMap(d => d.routes.map(r => r.path));
    const noFeatureRoutePaths = allRoutes.filter(p => !featureRoutes.includes(p));

    // noFeatureRoutePaths 가 있어야 이 테스트가 유효하다
    expect(noFeatureRoutePaths.length).toBeGreaterThan(0);

    render(<SystemStructurePage />);

    await waitFor(() => {
      // 기능 지도 탭(기본)에서는 @feature 없는 라우트의 path가 보이지 않아야 한다
      const featureMapSection = document.querySelector('[data-tab-panel="feature-map"]');
      if (featureMapSection) {
        noFeatureRoutePaths.forEach(path => {
          expect(featureMapSection.textContent).not.toContain(path);
        });
      }
    });
  });
});
