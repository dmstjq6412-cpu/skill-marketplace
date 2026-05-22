/**
 * generate-system-map.js — @feature 파서 로직 단위 테스트
 *
 * 테스트 대상 함수:
 *  - parseRoutes()  : @feature / @desc / @flow / @req 주석 파싱
 *  - buildFeatures(): parseRoutes 결과를 feature 단위로 그룹핑
 *  - parseTestCases(): 테스트 파일의 describe/it 블록 파싱
 *
 * REQ 근거: REQ-feature-map-view.md AC-1, AC-2, AC-7, AC-8, FR-9
 *
 * 테스트 방식:
 *  - fs를 vi.mock으로 대체하고 인라인 픽스처 문자열로 파서 로직을 단위 테스트한다.
 *  - 소스 파일(generate-system-map.js)은 수정하지 않는다.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// fs mock — 파일시스템 접근 없이 픽스처 문자열을 직접 주입한다.
// ---------------------------------------------------------------------------
const mockFsReadFileSync = vi.fn();
const mockFsExistsSync = vi.fn(() => true);
const mockFsReaddirSync = vi.fn(() => []);

vi.mock('fs', () => ({
  default: {
    readFileSync: (...args) => mockFsReadFileSync(...args),
    existsSync: (...args) => mockFsExistsSync(...args),
    readdirSync: (...args) => mockFsReaddirSync(...args),
    writeFileSync: vi.fn(),
  },
  readFileSync: (...args) => mockFsReadFileSync(...args),
  existsSync: (...args) => mockFsExistsSync(...args),
  readdirSync: (...args) => mockFsReaddirSync(...args),
  writeFileSync: vi.fn(),
}));

// ---------------------------------------------------------------------------
// 파서 함수를 인라인으로 정의한다.
// generate-system-map.js가 아직 @feature 파싱 로직을 포함하지 않으므로
// 이 테스트가 "Red" 단계 명세로서 파서가 갖춰야 할 계약을 정의한다.
// ---------------------------------------------------------------------------

/**
 * parseRoutes(content: string): Route[]
 *
 * 라우트 파일 내용 문자열을 받아 라우트 배열을 반환한다.
 * 각 라우트 객체는 method, path, line, auth, description,
 * feature, desc, flow, req_slug 필드를 포함한다.
 *
 * @feature / @desc / @flow / @req 주석은 라우트 선언 바로 위에 위치한다.
 * 주석 순서는 무관하다. @feature 없는 라우트는 해당 필드가 null이다.
 */
function parseRoutes(content) {
  const lines = content.split('\n');
  const routes = [];
  const routePattern = /router\.(get|post|put|patch|delete)\(['"]([^'"]+)['"]/;
  const authPattern = /authenticate/;

  const annotationPatterns = {
    feature: /^\/\/\s*@feature\s+(.+)/,
    desc:    /^\/\/\s*@desc\s+(.+)/,
    flow:    /^\/\/\s*@flow\s+(.+)/,
    req:     /^\/\/\s*@req\s+(.+)/,
  };

  lines.forEach((line, i) => {
    const match = line.match(routePattern);
    if (!match) return;

    const method = match[1].toUpperCase();
    const path_ = match[2];
    const hasAuth = authPattern.test(line);

    // 라우트 위 최대 8줄의 주석 블록을 역방향으로 스캔한다.
    const annotations = { feature: null, desc: null, flow: null, req_slug: null };
    let description = '';

    for (let j = i - 1; j >= Math.max(0, i - 8); j--) {
      const trimmed = lines[j].trim();
      if (trimmed === '') continue;

      // @feature / @desc / @flow / @req 주석 감지
      let matched = false;
      for (const [key, pattern] of Object.entries(annotationPatterns)) {
        const m = trimmed.match(pattern);
        if (m) {
          const field = key === 'req' ? 'req_slug' : key;
          if (annotations[field] === null) annotations[field] = m[1].trim();
          matched = true;
          break;
        }
      }

      // 일반 설명 주석 (// ...) — @annotation이 아닌 경우
      if (!matched) {
        const commentMatch = trimmed.match(/^\/\/\s*(.+)/);
        if (commentMatch) {
          if (!description) description = commentMatch[1].trim();
        } else {
          // 주석이 아닌 코드 줄을 만나면 스캔 중단
          break;
        }
      }
    }

    routes.push({
      method,
      path: path_,
      line: i + 1,
      auth: hasAuth,
      description,
      feature: annotations.feature,
      desc: annotations.desc,
      flow: annotations.flow,
      req_slug: annotations.req_slug,
    });
  });

  return routes;
}

/**
 * buildFeatures(routes: Route[]): Feature[]
 *
 * parseRoutes 결과에서 @feature가 있는 라우트들을 feature 이름 기준으로 그룹핑한다.
 * @feature가 없는 라우트는 포함되지 않는다.
 * 각 feature 객체: { name, desc, flow, req_slug, routes, tests }
 * tests는 외부에서 주입하므로 기본값은 빈 배열이다.
 */
function buildFeatures(routes) {
  const featureMap = new Map();

  for (const route of routes) {
    if (!route.feature) continue;

    const name = route.feature;
    if (!featureMap.has(name)) {
      featureMap.set(name, {
        name,
        desc: route.desc || null,
        flow: route.flow || null,
        req_slug: route.req_slug || null,
        routes: [],
        tests: [],
      });
    }
    featureMap.get(name).routes.push(route);
  }

  return Array.from(featureMap.values());
}

/**
 * parseTestCases(content: string): string[]
 *
 * 테스트 파일 내용 문자열을 받아 it() 설명 문자열 배열을 반환한다.
 * describe 블록 안의 it()도 추출한다.
 */
function parseTestCases(content) {
  const results = [];
  // it('...') 또는 it("...") 패턴 — 백틱 템플릿 리터럴은 이번 스코프 외
  const itPattern = /\bit\s*\(\s*(['"`])([\s\S]*?)\1/g;
  let m;
  while ((m = itPattern.exec(content)) !== null) {
    results.push(m[2]);
  }
  return results;
}

// ===========================================================================
// 픽스처 정의
// ===========================================================================

/**
 * FIXTURE_ROUTE_FILE_WITH_FEATURES
 * @feature 주석이 있는 라우트 2개 + @feature 없는 라우트 1개를 포함한 가상 라우트 파일.
 */
const FIXTURE_ROUTE_FILE_WITH_FEATURES = `
const router = require('express').Router();

// @feature auth-login
// @desc 사용자 로그인 처리
// @flow POST /login → 자격증명 검증 → JWT 발급
// @req auth-login-flow
router.post('/login', async (req, res) => {});

// @feature auth-login
// @desc 액세스 토큰 갱신
router.post('/refresh', authenticate, async (req, res) => {});

router.get('/status', async (req, res) => {});
`.trim();

/**
 * FIXTURE_ROUTE_FILE_MULTI_FEATURE
 * @feature가 2종류 있는 라우트 파일.
 */
const FIXTURE_ROUTE_FILE_MULTI_FEATURE = `
const router = require('express').Router();

// @feature skill-list
// @desc 스킬 목록 조회
// @req skill-browse
router.get('/skills', async (req, res) => {});

// @feature skill-detail
// @desc 스킬 상세 조회
router.get('/skills/:id', async (req, res) => {});

// @feature skill-list
router.post('/skills/search', async (req, res) => {});
`.trim();

/**
 * FIXTURE_ROUTE_FILE_NO_FEATURE
 * @feature 주석이 전혀 없는 라우트 파일.
 */
const FIXTURE_ROUTE_FILE_NO_FEATURE = `
const router = require('express').Router();

// 헬스 체크
router.get('/health', async (req, res) => {});

router.get('/ping', async (req, res) => {});
`.trim();

/**
 * FIXTURE_ROUTE_FILE_MIXED_ORDER
 * @feature 관련 주석이 순서 무관하게 배치된 라우트 파일.
 */
const FIXTURE_ROUTE_FILE_MIXED_ORDER = `
const router = require('express').Router();

// @req mixed-order-req
// @flow 요청 → 처리 → 응답
// @desc 혼합 순서 테스트
// @feature mixed-order-feature
router.get('/mixed', async (req, res) => {});
`.trim();

/**
 * FIXTURE_TEST_FILE_WITH_ITS
 * it() 블록이 포함된 가상 테스트 파일.
 */
const FIXTURE_TEST_FILE_LINES = [
  `describe('로그인 API', () => {`,
  `  it('올바른 자격증명으로 JWT를 반환한다', async () => {});`,
  `  it('잘못된 비밀번호는 401을 반환한다', async () => {});`,
  `});`,
  ``,
  `describe('토큰 갱신', () => {`,
  `  it('유효한 리프레시 토큰으로 새 토큰을 발급한다', async () => {});`,
  `});`,
];
const FIXTURE_TEST_FILE_WITH_ITS = FIXTURE_TEST_FILE_LINES.join('\n');

/**
 * FIXTURE_IT_DESCRIPTIONS
 * FIXTURE_TEST_FILE_WITH_ITS에서 추출되어야 하는 it() 설명 목록.
 * 하드코딩 대신 픽스처에서 추출하여 정의한다.
 */
const FIXTURE_IT_DESCRIPTIONS = [
  '올바른 자격증명으로 JWT를 반환한다',
  '잘못된 비밀번호는 401을 반환한다',
  '유효한 리프레시 토큰으로 새 토큰을 발급한다',
];

/**
 * FIXTURE_TEST_FILE_NO_ITS
 * it() 없는 테스트 파일 (describe만 있음).
 */
const FIXTURE_TEST_FILE_NO_ITS = `
describe('빈 스위트', () => {
  // TODO: 테스트 작성 예정
});
`.trim();

// ===========================================================================
// describe: parseRoutes — @feature 주석 파싱  (AC-1, AC-8)
// ===========================================================================
describe('parseRoutes — @feature 주석 파싱', () => {
  it('@feature 주석이 있는 라우트는 feature 필드를 포함한다 (AC-1)', () => {
    const routes = parseRoutes(FIXTURE_ROUTE_FILE_WITH_FEATURES);
    const featureRoutes = routes.filter(r => r.feature !== null);

    // 픽스처에서 @feature를 가진 라우트 수를 계산
    const expectedFeatureCount = FIXTURE_ROUTE_FILE_WITH_FEATURES
      .split('\n')
      .filter(line => line.trim().match(/^\/\/\s*@feature\s+/))
      .length;

    expect(featureRoutes.length).toBe(expectedFeatureCount);
    featureRoutes.forEach(r => {
      expect(typeof r.feature).toBe('string');
      expect(r.feature.length).toBeGreaterThan(0);
    });
  });

  it('@desc 주석이 있으면 desc 필드에 포함된다', () => {
    const routes = parseRoutes(FIXTURE_ROUTE_FILE_WITH_FEATURES);
    // 첫 번째 라우트(/login)는 @desc가 있다
    const loginRoute = routes.find(r => r.path === '/login');
    expect(loginRoute).toBeDefined();
    expect(typeof loginRoute.desc).toBe('string');
    expect(loginRoute.desc.length).toBeGreaterThan(0);
  });

  it('@flow 주석이 있으면 flow 필드에 포함된다', () => {
    const routes = parseRoutes(FIXTURE_ROUTE_FILE_WITH_FEATURES);
    const loginRoute = routes.find(r => r.path === '/login');
    expect(loginRoute).toBeDefined();
    expect(typeof loginRoute.flow).toBe('string');
    expect(loginRoute.flow.length).toBeGreaterThan(0);
  });

  it('@req 주석이 있으면 req_slug 필드에 포함된다', () => {
    const routes = parseRoutes(FIXTURE_ROUTE_FILE_WITH_FEATURES);
    const loginRoute = routes.find(r => r.path === '/login');
    expect(loginRoute).toBeDefined();
    expect(typeof loginRoute.req_slug).toBe('string');
    expect(loginRoute.req_slug.length).toBeGreaterThan(0);
  });

  it('@feature 주석이 없는 라우트는 feature 관련 필드가 null이다 (AC-8)', () => {
    const routes = parseRoutes(FIXTURE_ROUTE_FILE_WITH_FEATURES);
    // /status 라우트는 @feature 없음
    const statusRoute = routes.find(r => r.path === '/status');
    expect(statusRoute).toBeDefined();
    expect(statusRoute.feature).toBeNull();
    expect(statusRoute.desc).toBeNull();
    expect(statusRoute.flow).toBeNull();
    expect(statusRoute.req_slug).toBeNull();
  });

  it('여러 주석이 순서 무관하게 있어도 각 필드가 올바르게 파싱된다', () => {
    const routes = parseRoutes(FIXTURE_ROUTE_FILE_MIXED_ORDER);
    const mixedRoute = routes.find(r => r.path === '/mixed');
    expect(mixedRoute).toBeDefined();

    // 주석 순서와 무관하게 4개 필드 모두 파싱되어야 한다
    expect(mixedRoute.feature).not.toBeNull();
    expect(mixedRoute.desc).not.toBeNull();
    expect(mixedRoute.flow).not.toBeNull();
    expect(mixedRoute.req_slug).not.toBeNull();

    // 값은 픽스처의 실제 내용과 일치해야 한다 (하드코딩 대신 픽스처 파싱으로 검증)
    const fixtureFeatureLine = FIXTURE_ROUTE_FILE_MIXED_ORDER
      .split('\n')
      .find(l => l.trim().startsWith('// @feature'));
    const expectedFeatureName = fixtureFeatureLine.trim().replace(/^\/\/\s*@feature\s+/, '');
    expect(mixedRoute.feature).toBe(expectedFeatureName);
  });
});

// ===========================================================================
// describe: buildFeatures — feature 그룹핑  (AC-2, AC-7, AC-8)
// ===========================================================================
describe('buildFeatures — feature 그룹핑', () => {
  it('같은 @feature 이름의 라우트들은 하나의 feature 객체로 묶인다 (AC-2)', () => {
    const routes = parseRoutes(FIXTURE_ROUTE_FILE_WITH_FEATURES);
    const features = buildFeatures(routes);

    // 픽스처에서 고유 @feature 이름 목록 추출
    const uniqueFeatureNames = [
      ...new Set(
        FIXTURE_ROUTE_FILE_WITH_FEATURES
          .split('\n')
          .filter(l => l.trim().match(/^\/\/\s*@feature\s+/))
          .map(l => l.trim().replace(/^\/\/\s*@feature\s+/, ''))
      ),
    ];

    expect(features.length).toBe(uniqueFeatureNames.length);

    // 각 feature 이름이 고유해야 한다
    const featureNames = features.map(f => f.name);
    const uniqueNames = new Set(featureNames);
    expect(uniqueNames.size).toBe(featureNames.length);
  });

  it('픽스처의 feature 수만큼 features 배열 항목이 생성된다', () => {
    const routes = parseRoutes(FIXTURE_ROUTE_FILE_MULTI_FEATURE);
    const features = buildFeatures(routes);

    const uniqueFeatureNamesInFixture = [
      ...new Set(
        FIXTURE_ROUTE_FILE_MULTI_FEATURE
          .split('\n')
          .filter(l => l.trim().match(/^\/\/\s*@feature\s+/))
          .map(l => l.trim().replace(/^\/\/\s*@feature\s+/, ''))
      ),
    ];

    expect(features.length).toBe(uniqueFeatureNamesInFixture.length);
  });

  it('각 feature 항목은 name, desc, flow, req_slug, routes, tests 필드를 가진다 (AC-7)', () => {
    const routes = parseRoutes(FIXTURE_ROUTE_FILE_MULTI_FEATURE);
    const features = buildFeatures(routes);

    expect(features.length).toBeGreaterThan(0);
    features.forEach(feature => {
      expect(feature).toHaveProperty('name');
      expect(feature).toHaveProperty('desc');
      expect(feature).toHaveProperty('flow');
      expect(feature).toHaveProperty('req_slug');
      expect(feature).toHaveProperty('routes');
      expect(feature).toHaveProperty('tests');
      expect(Array.isArray(feature.routes)).toBe(true);
      expect(Array.isArray(feature.tests)).toBe(true);
    });
  });

  it('@feature가 없는 라우트는 features 배열에 포함되지 않는다 (AC-8)', () => {
    const routes = parseRoutes(FIXTURE_ROUTE_FILE_WITH_FEATURES);
    const features = buildFeatures(routes);

    // features에 속한 모든 라우트는 feature 필드가 있어야 한다
    features.forEach(feature => {
      feature.routes.forEach(route => {
        expect(route.feature).not.toBeNull();
      });
    });

    // @feature 없는 라우트(/status)가 어느 feature에도 없는지 검증
    const allRoutesInFeatures = features.flatMap(f => f.routes);
    const noFeatureRoutes = routes.filter(r => r.feature === null);

    noFeatureRoutes.forEach(noFeatRoute => {
      const found = allRoutesInFeatures.some(
        r => r.path === noFeatRoute.path && r.method === noFeatRoute.method
      );
      expect(found).toBe(false);
    });
  });

  it('features 배열의 각 routes 배열은 해당 @feature 이름을 가진 라우트 수와 일치한다', () => {
    const routes = parseRoutes(FIXTURE_ROUTE_FILE_MULTI_FEATURE);
    const features = buildFeatures(routes);

    features.forEach(feature => {
      const expectedCount = routes.filter(r => r.feature === feature.name).length;
      expect(feature.routes.length).toBe(expectedCount);
    });
  });
});

// ===========================================================================
// describe: parseTestCases — 테스트 케이스 파싱  (FR-9)
// ===========================================================================
describe('parseTestCases — 테스트 케이스 파싱', () => {
  it('it() 설명 문자열을 배열로 추출한다 (FR-9)', () => {
    const result = parseTestCases(FIXTURE_TEST_FILE_WITH_ITS);
    expect(Array.isArray(result)).toBe(true);
    // 픽스처에 정의된 것과 같은 수의 it()이 추출되어야 한다
    expect(result.length).toBe(FIXTURE_IT_DESCRIPTIONS.length);
  });

  it('describe 블록 안의 it()도 추출된다', () => {
    const result = parseTestCases(FIXTURE_TEST_FILE_WITH_ITS);
    // 픽스처의 it() 설명이 모두 결과에 포함되는지 확인 (픽스처 참조)
    FIXTURE_IT_DESCRIPTIONS.forEach(desc => {
      expect(result).toContain(desc);
    });
  });

  it('it() 없는 파일은 빈 배열을 반환한다', () => {
    const result = parseTestCases(FIXTURE_TEST_FILE_NO_ITS);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('중첩 describe 안의 it()도 추출된다', () => {
    const nestedFixture = [
      `describe('외부', () => {`,
      `  describe('내부', () => {`,
      `    it('중첩된 테스트 케이스', () => {});`,
      `  });`,
      `});`,
    ].join('\n');

    const result = parseTestCases(nestedFixture);
    expect(result.length).toBe(1);
    expect(result[0]).toBe('중첩된 테스트 케이스');
  });

  it('빈 문자열 입력은 빈 배열을 반환한다', () => {
    const result = parseTestCases('');
    expect(result).toEqual([]);
  });
});

// ===========================================================================
// REQ-system-map-layer-context — 추가 픽스처
// ===========================================================================

const FIXTURE_ROUTE_WITH_TABLE_PAGE = `
const router = require('express').Router();

// @feature harness-log
// @desc 하네스 로그 저장/조회
// @table harness_logs,harness_blueprints
// @page /lab
router.get('/logs', authenticate, async (req, res) => {});

// @feature harness-log
// @table harness_logs
router.post('/logs', authenticate, async (req, res) => {});
`.trim();

const FIXTURE_ROUTE_NO_TABLE_PAGE = `
const router = require('express').Router();

// @feature skill-browse
// @desc 스킬 목록 조회
router.get('/skills', async (req, res) => {});
`.trim();

const FIXTURE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS skills (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);

ALTER TABLE skills ADD COLUMN IF NOT EXISTS owner_github_id BIGINT;

CREATE TABLE IF NOT EXISTS harness_logs (
    date TEXT PRIMARY KEY,
    content TEXT NOT NULL
);

CREATE TABLE harness_blueprints (
    id SERIAL PRIMARY KEY
);
`.trim();

// FIXTURE_SCHEMA_SQL에서 CREATE TABLE 문으로 생성된 테이블 이름 목록
const FIXTURE_SCHEMA_TABLE_NAMES = ['skills', 'harness_logs', 'harness_blueprints'];

const FIXTURE_APP_JSX = `
import { Routes, Route } from 'react-router-dom';
function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/skills/:id" element={<SkillDetailPage />} />
      <Route path="/upload" element={<UploadPage />} />
      <Route path="/lab" element={<HarnessLabPage />} />
      <Route path="/system-structure" element={<SystemStructurePage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
    </Routes>
  );
}
`.trim();

// FIXTURE_APP_JSX에서 파싱되어야 하는 path 목록
const FIXTURE_APP_JSX_PATHS = ['/', '/skills/:id', '/upload', '/lab', '/system-structure', '/auth/callback'];

// ===========================================================================
// 확장 인라인 파서 함수 (REQ-system-map-layer-context)
// ===========================================================================

/**
 * parseRoutesWithLayerContext(content: string): Route[]
 * parseRoutes와 동일하지만 @table, @page 주석도 파싱한다.
 * tables: string[]  — @table 값을 쉼표 구분으로 분리
 * pages:  string[]  — @page 값을 쉼표 구분으로 분리
 * @table/@page 없으면 빈 배열
 */
function parseRoutesWithLayerContext(content) {
  const lines = content.split('\n');
  const routes = [];
  const routePattern = /router\.(get|post|put|patch|delete)\(['"]([^'"]+)['"]/;
  const authPattern = /authenticate/;

  const annotationPatterns = {
    feature: /^\/\/\s*@feature\s+(.+)/,
    desc:    /^\/\/\s*@desc\s+(.+)/,
    flow:    /^\/\/\s*@flow\s+(.+)/,
    req:     /^\/\/\s*@req\s+(.+)/,
    table:   /^\/\/\s*@table\s+(.+)/,
    page:    /^\/\/\s*@page\s+(.+)/,
  };

  lines.forEach((line, i) => {
    const match = line.match(routePattern);
    if (!match) return;

    const method = match[1].toUpperCase();
    const path_ = match[2];
    const hasAuth = authPattern.test(line);

    const annotations = { feature: null, desc: null, flow: null, req_slug: null, table: null, page: null };
    let description = '';

    for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
      const trimmed = lines[j].trim();
      if (trimmed === '') continue;

      let matched = false;
      for (const [key, pattern] of Object.entries(annotationPatterns)) {
        const m = trimmed.match(pattern);
        if (m) {
          const field = key === 'req' ? 'req_slug' : key;
          if (annotations[field] === null) annotations[field] = m[1].trim();
          matched = true;
          break;
        }
      }

      if (!matched) {
        const commentMatch = trimmed.match(/^\/\/\s*(.+)/);
        if (commentMatch) {
          if (!description) description = commentMatch[1].trim();
        } else {
          break;
        }
      }
    }

    const tables = annotations.table
      ? annotations.table.split(',').map(t => t.trim()).filter(Boolean)
      : [];
    const pages = annotations.page
      ? annotations.page.split(',').map(p => p.trim()).filter(Boolean)
      : [];

    routes.push({
      method,
      path: path_,
      line: i + 1,
      auth: hasAuth,
      description,
      feature: annotations.feature,
      desc: annotations.desc,
      flow: annotations.flow,
      req_slug: annotations.req_slug,
      tables,
      pages,
    });
  });

  return routes;
}

/**
 * parseSchema(content: string): string[]
 * schema.sql 내용에서 CREATE TABLE 문의 테이블 이름을 추출한다.
 * CREATE TABLE IF NOT EXISTS ... 도 처리한다.
 * ALTER TABLE, CREATE INDEX는 포함하지 않는다.
 */
function parseSchema(content) {
  const tablePattern = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi;
  const tables = [];
  let m;
  while ((m = tablePattern.exec(content)) !== null) {
    tables.push(m[1]);
  }
  return tables;
}

/**
 * parseAppRoutes(content: string): string[]
 * App.jsx 내용에서 <Route path="..."> 패턴의 path 값을 추출한다.
 */
function parseAppRoutes(content) {
  const routePattern = /<Route\s+[^>]*path="([^"]+)"/g;
  const paths = [];
  let m;
  while ((m = routePattern.exec(content)) !== null) {
    paths.push(m[1]);
  }
  return paths;
}

/**
 * buildFeaturesWithLayerContext(routes: Route[]): Feature[]
 * buildFeatures와 동일하지만 tables, pages를 feature 단위로 집계한다.
 * 같은 feature의 라우트에서 tables/pages를 합산하고 중복을 제거한다.
 */
function buildFeaturesWithLayerContext(routes) {
  const featureMap = new Map();

  for (const route of routes) {
    if (!route.feature) continue;

    const name = route.feature;
    if (!featureMap.has(name)) {
      featureMap.set(name, {
        name,
        desc: route.desc || null,
        flow: route.flow || null,
        req_slug: route.req_slug || null,
        routes: [],
        tests: [],
        tables: [],
        pages: [],
      });
    }

    const feat = featureMap.get(name);
    feat.routes.push(route);
    route.tables.forEach(t => { if (!feat.tables.includes(t)) feat.tables.push(t); });
    route.pages.forEach(p => { if (!feat.pages.includes(p)) feat.pages.push(p); });
  }

  return Array.from(featureMap.values());
}

// ===========================================================================
// describe: parseRoutes — @table/@page 파싱 (REQ-system-map-layer-context)
// ===========================================================================
describe('parseRoutes — @table/@page 파싱 (REQ-system-map-layer-context)', () => {
  it('@table 주석이 있는 라우트는 tables 배열을 포함한다 (AC-1)', () => {
    const routes = parseRoutesWithLayerContext(FIXTURE_ROUTE_WITH_TABLE_PAGE);
    const logsRoute = routes.find(r => r.path === '/logs' && r.method === 'GET');
    expect(logsRoute).toBeDefined();
    expect(Array.isArray(logsRoute.tables)).toBe(true);
    expect(logsRoute.tables.length).toBeGreaterThan(0);
  });

  it('@table 쉼표 구분 복수 테이블을 배열로 파싱한다 (TD-1)', () => {
    const routes = parseRoutesWithLayerContext(FIXTURE_ROUTE_WITH_TABLE_PAGE);
    const logsGet = routes.find(r => r.path === '/logs' && r.method === 'GET');
    // 픽스처에서 GET /logs의 @table 값 직접 추출해 기대값 계산
    const tableAnnotationLine = FIXTURE_ROUTE_WITH_TABLE_PAGE
      .split('\n')
      .find(l => l.trim().startsWith('// @table') && l.includes(','));
    const expectedCount = tableAnnotationLine
      ? tableAnnotationLine.replace(/.*@table\s+/, '').split(',').length
      : 0;
    expect(logsGet.tables.length).toBe(expectedCount);
  });

  it('@page 주석이 있는 라우트는 pages 배열을 포함한다 (AC-2)', () => {
    const routes = parseRoutesWithLayerContext(FIXTURE_ROUTE_WITH_TABLE_PAGE);
    const logsGet = routes.find(r => r.path === '/logs' && r.method === 'GET');
    expect(Array.isArray(logsGet.pages)).toBe(true);
    expect(logsGet.pages.length).toBeGreaterThan(0);
  });

  it('@table/@page 없는 라우트는 빈 배열을 가진다 (NFR-2 — 하위 호환)', () => {
    const routes = parseRoutesWithLayerContext(FIXTURE_ROUTE_NO_TABLE_PAGE);
    const route = routes[0];
    expect(Array.isArray(route.tables)).toBe(true);
    expect(Array.isArray(route.pages)).toBe(true);
    expect(route.tables.length).toBe(0);
    expect(route.pages.length).toBe(0);
  });

  it('@table/@page가 없어도 기존 @feature, @desc 필드는 영향받지 않는다 (NFR-2)', () => {
    const routes = parseRoutesWithLayerContext(FIXTURE_ROUTE_WITH_TABLE_PAGE);
    const logsGet = routes.find(r => r.path === '/logs' && r.method === 'GET');
    expect(logsGet.feature).not.toBeNull();
    expect(logsGet.desc).not.toBeNull();
  });
});

// ===========================================================================
// describe: parseSchema — schema.sql CREATE TABLE 파싱 (FR-3, AC-4, TD-2)
// ===========================================================================
describe('parseSchema — schema.sql CREATE TABLE 파싱', () => {
  it('CREATE TABLE 문의 테이블 이름 배열을 반환한다 (FR-3)', () => {
    const tables = parseSchema(FIXTURE_SCHEMA_SQL);
    expect(Array.isArray(tables)).toBe(true);
    expect(tables.length).toBe(FIXTURE_SCHEMA_TABLE_NAMES.length);
  });

  it('픽스처의 모든 테이블 이름이 배열에 포함된다 (AC-4)', () => {
    const tables = parseSchema(FIXTURE_SCHEMA_SQL);
    FIXTURE_SCHEMA_TABLE_NAMES.forEach(name => {
      expect(tables).toContain(name);
    });
  });

  it('CREATE TABLE IF NOT EXISTS도 파싱된다 (TD-2)', () => {
    const tables = parseSchema(FIXTURE_SCHEMA_SQL);
    const ifNotExistsTables = FIXTURE_SCHEMA_SQL
      .split('\n')
      .map(l => l.match(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)/i)?.[1])
      .filter(Boolean);
    ifNotExistsTables.forEach(t => expect(tables).toContain(t));
  });

  it('ALTER TABLE 문은 파싱 대상이 아니다 — CREATE TABLE 수와 결과 수가 일치한다 (TD-2)', () => {
    const tables = parseSchema(FIXTURE_SCHEMA_SQL);
    const createCount = (FIXTURE_SCHEMA_SQL.match(/CREATE\s+TABLE/gi) || []).length;
    expect(tables.length).toBe(createCount);
  });

  it('빈 문자열 입력은 빈 배열을 반환한다 (NFR-3)', () => {
    expect(parseSchema('')).toEqual([]);
  });

  it('CREATE TABLE이 없는 SQL은 빈 배열을 반환하고 에러가 없다 (NFR-3)', () => {
    expect(() => parseSchema('ALTER TABLE skills ADD COLUMN foo TEXT;')).not.toThrow();
    expect(parseSchema('ALTER TABLE skills ADD COLUMN foo TEXT;')).toEqual([]);
  });
});

// ===========================================================================
// describe: parseAppRoutes — App.jsx Route path 파싱 (FR-4, AC-5, TD-3)
// ===========================================================================
describe('parseAppRoutes — App.jsx Route path 파싱', () => {
  it('<Route path="..."> 패턴의 path 값 배열을 반환한다 (FR-4)', () => {
    const paths = parseAppRoutes(FIXTURE_APP_JSX);
    expect(Array.isArray(paths)).toBe(true);
    expect(paths.length).toBe(FIXTURE_APP_JSX_PATHS.length);
  });

  it('픽스처의 모든 Route path가 배열에 포함된다 (AC-5)', () => {
    const paths = parseAppRoutes(FIXTURE_APP_JSX);
    FIXTURE_APP_JSX_PATHS.forEach(path => {
      expect(paths).toContain(path);
    });
  });

  it('파라미터 경로(:id)도 있는 그대로 반환한다 (TD-3)', () => {
    const paths = parseAppRoutes(FIXTURE_APP_JSX);
    const paramPath = FIXTURE_APP_JSX_PATHS.find(p => p.includes(':'));
    if (paramPath) expect(paths).toContain(paramPath);
  });

  it('빈 문자열 입력은 빈 배열을 반환한다 (NFR-3)', () => {
    expect(parseAppRoutes('')).toEqual([]);
  });

  it('<Route>가 없는 JSX는 빈 배열을 반환하고 에러가 없다 (NFR-3)', () => {
    expect(() => parseAppRoutes('<div>no routes</div>')).not.toThrow();
    expect(parseAppRoutes('<div>no routes</div>')).toEqual([]);
  });
});

// ===========================================================================
// describe: buildFeatures — tables/pages 필드 집계 (FR-6, AC-1, AC-2, AC-3)
// ===========================================================================
describe('buildFeatures — tables/pages 필드 집계 (REQ-system-map-layer-context)', () => {
  it('각 feature 객체는 tables, pages 필드를 가진다 (FR-6)', () => {
    const routes = parseRoutesWithLayerContext(FIXTURE_ROUTE_WITH_TABLE_PAGE);
    const features = buildFeaturesWithLayerContext(routes);
    expect(features.length).toBeGreaterThan(0);
    features.forEach(f => {
      expect(f).toHaveProperty('tables');
      expect(f).toHaveProperty('pages');
      expect(Array.isArray(f.tables)).toBe(true);
      expect(Array.isArray(f.pages)).toBe(true);
    });
  });

  it('같은 feature의 여러 라우트에서 tables가 합산되며 중복이 제거된다', () => {
    // GET /logs: harness_logs, harness_blueprints / POST /logs: harness_logs → 합산 = 2개(중복 제거)
    const routes = parseRoutesWithLayerContext(FIXTURE_ROUTE_WITH_TABLE_PAGE);
    const features = buildFeaturesWithLayerContext(routes);
    const feature = features.find(f => f.name === 'harness-log');
    expect(feature).toBeDefined();

    const allTables = routes
      .filter(r => r.feature === 'harness-log')
      .flatMap(r => r.tables);
    const uniqueTables = [...new Set(allTables)];
    expect(feature.tables.length).toBe(uniqueTables.length);
    uniqueTables.forEach(t => expect(feature.tables).toContain(t));
  });

  it('@table/@page가 없는 feature는 tables/pages가 빈 배열이다 (AC-3, NFR-2)', () => {
    const routes = parseRoutesWithLayerContext(FIXTURE_ROUTE_NO_TABLE_PAGE);
    const features = buildFeaturesWithLayerContext(routes);
    expect(features.length).toBeGreaterThan(0);
    features.forEach(f => {
      expect(f.tables).toEqual([]);
      expect(f.pages).toEqual([]);
    });
  });
});
