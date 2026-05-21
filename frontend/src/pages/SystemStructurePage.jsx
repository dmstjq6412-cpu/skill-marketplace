import React, { useEffect, useState } from 'react';
import { fetchSystemMap } from '../api/client';

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
    <section className="mb-8">
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
              <RouteRow key={i} route={route} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function SystemStructurePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSystemMap()
      .then(setData)
      .catch(err => setError(err.message || '로드 실패'))
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div className="max-w-7xl mx-auto px-5 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
          My System Structure
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {data.domains.length}개 도메인 · {totalRoutes}개 엔드포인트 · 생성: {data.generated_at}
        </p>
      </div>

      {data.domains.map((domain, i) => (
        <DomainSection key={i} domain={domain} />
      ))}
    </div>
  );
}
