import React, { useEffect, useState } from 'react';
import { fetchSystemMap, fetchCallGraph } from '../api/client';

const METHOD_COLORS = {
  GET:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  POST:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PUT:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PATCH:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function MethodBadge({ method }) {
  const color = METHOD_COLORS[method] || 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-semibold ${color}`}>
      {method}
    </span>
  );
}

function RouteRow({ route }) {
  return (
    <tr className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <td className="px-4 py-3 w-24">
        <MethodBadge method={route.method} />
      </td>
      <td className="px-4 py-3 font-mono text-sm text-slate-800 dark:text-slate-200">
        {route.path}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
        {route.description || '—'}
      </td>
      <td className="px-4 py-3 text-center text-base">
        {route.auth ? '🔒' : '🔓'}
      </td>
      <td className="px-4 py-3 text-xs font-mono text-slate-500 dark:text-slate-500">
        {route.client_fn ? route.client_fn.name : '—'}
      </td>
      <td className="px-4 py-3 text-xs font-mono text-slate-500 dark:text-slate-500">
        {route.test_file || '—'}
      </td>
      <td className="px-4 py-3">
        {route.req_slug ? (
          <span
            data-testid="req-badge"
            className="inline-block px-2 py-0.5 rounded text-xs font-mono bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
          >
            REQ
          </span>
        ) : (
          <span
            data-testid="no-req"
            className="inline-block px-2 py-0.5 rounded text-xs text-slate-400 dark:text-slate-600"
          >
            REQ 없음
          </span>
        )}
      </td>
    </tr>
  );
}

function DomainSection({ domain }) {
  return (
    <section className="mb-8" data-domain={domain.name}>
      <h2 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
        {domain.name}
        <span className="text-xs font-normal text-slate-400 dark:text-slate-600">
          {domain.routes.length}개 엔드포인트
        </span>
      </h2>
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/60">
            <tr>
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 w-24">Method</th>
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">Path</th>
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">설명</th>
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 text-center">인증</th>
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">Client 함수</th>
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">테스트</th>
              <th className="px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">REQ</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-[#0d0d14]">
            {domain.routes.map((route, i) => (
              <RouteRow key={`${domain.name}-${route.method}-${route.path}-${i}`} route={route} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FeatureCard({ feature }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      data-feature-card
      className="rounded-xl border border-slate-200 dark:border-slate-800 mb-4 overflow-hidden"
    >
      <button
        data-toggle
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-3 bg-white dark:bg-[#0d0d14] hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 dark:text-white text-sm font-mono">
              {feature.name}
            </span>
            {feature.req_slug && (
              <span
                data-req-badge
                data-testid="req-badge"
                className="inline-block px-2 py-0.5 rounded text-xs font-mono bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
              >
                REQ-{feature.req_slug}
              </span>
            )}
            <span className="text-xs text-slate-400 dark:text-slate-600">
              {feature.routes.length}개 라우트
            </span>
          </div>
          {feature.desc && (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{feature.desc}</p>
          )}
          {feature.flow && (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 font-mono">{feature.flow}</p>
          )}
        </div>
        <span className="text-slate-400 dark:text-slate-600 text-xs mt-0.5">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-800">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60">
              <tr>
                <th className="px-5 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 w-24">Method</th>
                <th className="px-5 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">Path</th>
                <th className="px-5 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 text-center">인증</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-[#0d0d14]">
              {feature.routes.map((r, i) => (
                <tr
                  key={`${r.method}-${r.path}-${i}`}
                  data-route-row
                  className="border-t border-slate-100 dark:border-slate-800"
                >
                  <td className="px-5 py-2.5">
                    <MethodBadge method={r.method} />
                  </td>
                  <td className="px-5 py-2.5 font-mono text-sm text-slate-800 dark:text-slate-200">
                    {r.path}
                  </td>
                  <td className="px-5 py-2.5 text-center text-base">
                    {r.auth ? '🔒' : '🔓'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {feature.tests.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">테스트 케이스</p>
              <ul className="space-y-1">
                {feature.tests.map((t, i) => (
                  <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feature.tables && feature.tables.length > 0 && (
            <div
              data-testid="tables-section"
              data-tables-section
              className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20"
            >
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">DB 테이블</p>
              <div className="flex flex-wrap gap-1.5">
                {feature.tables.map((t, i) => (
                  <span
                    key={i}
                    className="inline-block px-2 py-0.5 rounded text-xs font-mono bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {feature.pages && feature.pages.length > 0 && (
            <div
              data-testid="pages-section"
              data-pages-section
              className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20"
            >
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">프론트 페이지</p>
              <div className="flex flex-wrap gap-1.5">
                {feature.pages.map((p, i) => (
                  <span
                    key={i}
                    className="inline-block px-2 py-0.5 rounded text-xs font-mono bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SystemStructurePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('feature-map');
  const [callGraph, setCallGraph] = useState(null);

  useEffect(() => {
    fetchSystemMap()
      .then(setData)
      .catch(err => setError(err.message || '로드 실패'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'dependency') {
      fetchCallGraph()
        .then(setCallGraph)
        .catch(() => setCallGraph({ nodes: {} }));
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-5 py-12 flex items-center justify-center" data-testid="loading">
        <span className="text-slate-400 dark:text-slate-600 text-sm">로딩 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-5 py-12" data-testid="error">
        <p className="text-red-500 text-sm">오류: {error}</p>
      </div>
    );
  }

  const totalRoutes = data.domains.reduce((acc, d) => acc + d.routes.length, 0);
  const features = data.features || [];

  return (
    <div className="max-w-7xl mx-auto px-5 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
          My System Structure
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {data.domains.length}개 도메인 · {totalRoutes}개 엔드포인트 · {features.length}개 기능 · 생성: {data.generated_at}
        </p>
      </div>

      {/* 탭 버튼 */}
      <div className="flex gap-1 mb-6 border-b border-slate-200 dark:border-slate-800" role="tablist">
        <button
          role="tab"
          data-tab="feature-map"
          aria-selected={activeTab === 'feature-map'}
          onClick={() => setActiveTab('feature-map')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'feature-map'
              ? 'border-violet-500 text-violet-600 dark:text-violet-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          기능 지도
        </button>
        <button
          role="tab"
          data-tab="api-list"
          aria-selected={activeTab === 'api-list'}
          onClick={() => setActiveTab('api-list')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'api-list'
              ? 'border-violet-500 text-violet-600 dark:text-violet-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          API 목록
        </button>
        <button
          role="tab"
          data-tab="dependency"
          aria-selected={activeTab === 'dependency'}
          onClick={() => setActiveTab('dependency')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'dependency'
              ? 'border-violet-500 text-violet-600 dark:text-violet-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          의존성
        </button>
      </div>

      {/* 기능 지도 탭 */}
      <div data-tab-panel="feature-map" className={activeTab !== 'feature-map' ? 'hidden' : ''}>
        {features.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-600">
            @feature 주석이 있는 라우트가 없습니다.
          </p>
        ) : (
          features.map((feature, i) => (
            <FeatureCard key={`${feature.name}-${i}`} feature={feature} />
          ))
        )}
      </div>

      {/* API 목록 탭 */}
      <div data-tab-panel="api-list" className={activeTab !== 'api-list' ? 'hidden' : ''}>
        {data.domains.map((domain, i) => (
          <DomainSection key={`${domain.name}-${i}`} domain={domain} />
        ))}
      </div>

      {/* 의존성 탭 */}
      <div data-tab-panel="dependency" className={activeTab !== 'dependency' ? 'hidden' : ''}>
        <DependencyTable callGraph={callGraph} />
      </div>
    </div>
  );
}

function DependencyTable({ callGraph }) {
  if (!callGraph) {
    return (
      <p className="text-sm text-slate-400 dark:text-slate-600">로딩 중...</p>
    );
  }

  const sharedNodes = Object.entries(callGraph.nodes || {})
    .filter(([, node]) => (node.affects_features || []).length >= 2)
    .sort(([, a], [, b]) => b.affects_features.length - a.affects_features.length);

  if (sharedNodes.length === 0) {
    return (
      <p className="text-sm text-slate-400 dark:text-slate-600" data-testid="no-shared-code">
        (공유 코드 없음)
      </p>
    );
  }

  return (
    <div>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
        여러 feature에 영향을 주는 공유 코드입니다. 수정 시 영향 범위를 확인하세요.
      </p>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="px-4 py-2 text-slate-500 dark:text-slate-400 font-medium">파일</th>
            <th className="px-4 py-2 text-slate-500 dark:text-slate-400 font-medium w-20 text-center">영향 수</th>
            <th className="px-4 py-2 text-slate-500 dark:text-slate-400 font-medium">영향받는 feature</th>
          </tr>
        </thead>
        <tbody>
          {sharedNodes.map(([filePath, node]) => (
            <tr
              key={filePath}
              data-dep-row
              className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                {filePath.replace('backend/src/', '')}
              </td>
              <td className="px-4 py-3 text-center">
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {node.affects_features.length}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {node.affects_features.map(feat => (
                    <span
                      key={feat}
                      className="inline-block px-2 py-0.5 rounded text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
