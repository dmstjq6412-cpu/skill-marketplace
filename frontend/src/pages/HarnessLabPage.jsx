import React, { useState, useEffect } from 'react';
import { fetchHarnessLogs, fetchHarnessLog, fetchHarnessBlueprints, fetchHarnessBlueprint, fetchHarnessBlueprintDiff } from '../api/client';
import MarkdownViewer from '../components/MarkdownViewer';

const STATUS_COLOR = {
  DONE: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
  TODO: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
  IN_PROGRESS: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20',
};

function SkillBadge({ skill }) {
  const cls = STATUS_COLOR[skill.status] || STATUS_COLOR.TODO;
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${cls}`}>
      <span className="font-mono font-medium">{skill.name}</span>
      <div className="flex items-center gap-2">
        {skill.version && <span className="text-xs opacity-70">{skill.version}</span>}
        <span className="text-xs font-semibold">{skill.status}</span>
      </div>
    </div>
  );
}

function CoverageBar({ value, label }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{label}</span>
        <span className="font-semibold text-slate-700 dark:text-slate-300">{value}%</span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function DiffBadge({ change }) {
  if (change.type === 'added') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-sm">
        <span className="text-emerald-500 font-bold">+</span>
        <span className="font-mono font-medium text-emerald-700 dark:text-emerald-400">{change.name}</span>
        <span className="text-xs text-emerald-600 dark:text-emerald-500">추가됨</span>
      </div>
    );
  }
  if (change.type === 'removed') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 text-sm">
        <span className="text-red-500 font-bold">−</span>
        <span className="font-mono font-medium text-red-700 dark:text-red-400">{change.name}</span>
        <span className="text-xs text-red-600 dark:text-red-500">제거됨</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 text-sm">
      <span className="text-blue-500 font-bold">~</span>
      <span className="font-mono font-medium text-blue-700 dark:text-blue-400">{change.name}</span>
      <span className="text-xs text-slate-500">
        {change.before?.status} → {change.after?.status}
        {change.before?.version !== change.after?.version && ` · ${change.before?.version} → ${change.after?.version}`}
      </span>
    </div>
  );
}

export default function HarnessLabPage() {
  const [tab, setTab] = useState('logs'); // 'logs' | 'blueprint'
  const [logs, setLogs] = useState([]);
  const [blueprints, setBlueprints] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [logContent, setLogContent] = useState(null);
  const [blueprint, setBlueprint] = useState(null);
  const [diff, setDiff] = useState(null);
  const [diffFrom, setDiffFrom] = useState('');
  const [diffTo, setDiffTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeViz, setActiveViz] = useState(null); // 'todo-architecture' | 'git-guard'

  useEffect(() => {
    fetchHarnessLogs().then(d => setLogs(d.logs || []));
    fetchHarnessBlueprints().then(d => setBlueprints(d.blueprints || []));
  }, []);

  async function selectLog(date) {
    setSelectedDate(date);
    setLogContent(null);
    setLoading(true);
    try {
      const data = await fetchHarnessLog(date);
      setLogContent(data.content);
    } finally {
      setLoading(false);
    }
  }

  async function selectBlueprint(date) {
    setSelectedDate(date);
    setBlueprint(null);
    setDiff(null);
    setLoading(true);
    try {
      const data = await fetchHarnessBlueprint(date);
      setBlueprint(data);
    } finally {
      setLoading(false);
    }
  }

  async function loadDiff() {
    if (!diffFrom || !diffTo) return;
    setDiff(null);
    setLoading(true);
    try {
      const data = await fetchHarnessBlueprintDiff(diffFrom, diffTo);
      setDiff(data);
    } finally {
      setLoading(false);
    }
  }

  const harness4Skills = ['tdd-guard-claude', 'security-guard', 'git-guard-claude', 'todo-architecture'];

  return (
    <div className="max-w-7xl mx-auto px-5 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-violet-500/30">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Harness Lab</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">My Harness Development Journal</p>
          </div>
        </div>

        {/* Harness skill pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          {harness4Skills.map(s => (
            <span key={s} className="text-xs font-mono px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20">
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Tab */}
      <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl w-fit">
        {[['logs', '개발 일지'], ['blueprint', '블루프린트'], ['viz', '시각화']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setSelectedDate(null); setLogContent(null); setBlueprint(null); setDiff(null); setActiveViz(null); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
              tab === key
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Logs Tab */}
      {tab === 'logs' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Log list */}
          <div className="lg:col-span-1 space-y-2">
            <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">세션 기록</h2>
            {logs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-600">
                <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">아직 일지가 없습니다.</p>
                <p className="text-xs mt-1 font-mono">/harness-log 로 첫 일지를 저장하세요</p>
              </div>
            ) : (
              logs.map(log => (
                <button
                  key={log.date}
                  onClick={() => selectLog(log.date)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-150 ${
                    selectedDate === log.date
                      ? 'border-violet-300 dark:border-violet-500/40 bg-violet-50 dark:bg-violet-500/10'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111218] hover:border-violet-200 dark:hover:border-violet-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white font-mono">{log.date}</span>
                    <svg className="w-4 h-4 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  {log.summary && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{log.summary}</p>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Log content */}
          <div className="lg:col-span-2">
            {loading && (
              <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!loading && !logContent && (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-600">
                <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
                </svg>
                <p className="text-sm">왼쪽에서 날짜를 선택하세요</p>
              </div>
            )}
            {!loading && logContent && (
              <div className="bg-white dark:bg-[#111218] rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                <MarkdownViewer content={logContent} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Viz Tab */}
      {tab === 'viz' && (
        <div className="space-y-4">
          {/* Selector */}
          <div className="flex gap-2">
            {[
              { key: 'todo-architecture', label: 'Enterprise Vibe Architecture', icon: '🏗' },
              { key: 'git-guard', label: 'Git Guard Flow', icon: '🔀' },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveViz(key)}
                className={`px-4 py-2 text-sm font-medium rounded-xl border transition-all duration-150 ${
                  activeViz === key
                    ? 'border-violet-300 dark:border-violet-500/40 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111218] text-slate-600 dark:text-slate-400 hover:border-violet-200 dark:hover:border-violet-500/20'
                }`}
              >
                <span className="mr-1.5">{icon}</span>{label}
              </button>
            ))}
          </div>

          {!activeViz && (
            <div className="flex flex-col items-center justify-center h-80 text-slate-400 dark:text-slate-600">
              <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
              </svg>
              <p className="text-sm">위에서 시각화 파일을 선택하세요</p>
            </div>
          )}

          {activeViz && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white" style={{ height: '78vh' }}>
              <iframe
                key={activeViz}
                src={`/api/harness/html/${activeViz}`}
                className="w-full h-full border-0"
                title={activeViz}
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          )}
        </div>
      )}

      {/* Blueprint Tab */}
      {tab === 'blueprint' && (
        <div className="space-y-6">
          {/* Diff tool */}
          <div className="bg-white dark:bg-[#111218] rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">블루프린트 변화 비교</h2>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">From</label>
                <select
                  value={diffFrom}
                  onChange={e => setDiffFrom(e.target.value)}
                  className="text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  <option value="">날짜 선택</option>
                  {blueprints.map(b => <option key={b.date} value={b.date}>{b.date}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">To</label>
                <select
                  value={diffTo}
                  onChange={e => setDiffTo(e.target.value)}
                  className="text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  <option value="">날짜 선택</option>
                  {blueprints.map(b => <option key={b.date} value={b.date}>{b.date}</option>)}
                </select>
              </div>
              <button
                onClick={loadDiff}
                disabled={!diffFrom || !diffTo || loading}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                비교
              </button>
            </div>

            {diff && (
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400 font-mono">{diff.from}</p>
                    {diff.coverage_before && <CoverageBar value={diff.coverage_before.current} label="커버리지" />}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400 font-mono">{diff.to}</p>
                    {diff.coverage_after && <CoverageBar value={diff.coverage_after.current} label="커버리지" />}
                  </div>
                </div>

                {diff.changes.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500">변화 없음</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">변경 사항</p>
                    {diff.changes.map(c => <DiffBadge key={c.name} change={c} />)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Blueprint list + detail */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-2">
              <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">스냅샷 목록</h2>
              {blueprints.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-slate-600">
                  <p className="text-sm">아직 블루프린트가 없습니다.</p>
                  <p className="text-xs mt-1 font-mono">/harness-log 실행 시 자동 저장됩니다</p>
                </div>
              ) : (
                blueprints.map(b => (
                  <button
                    key={b.date}
                    onClick={() => selectBlueprint(b.date)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-150 ${
                      selectedDate === b.date
                        ? 'border-violet-300 dark:border-violet-500/40 bg-violet-50 dark:bg-violet-500/10'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111218] hover:border-violet-200 dark:hover:border-violet-500/20'
                    }`}
                  >
                    <span className="text-sm font-semibold text-slate-900 dark:text-white font-mono">{b.date}</span>
                    {b.coverage && (
                      <p className="text-xs text-slate-400 mt-1">커버리지 {b.coverage.current}%</p>
                    )}
                    {b.session_summary && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{b.session_summary}</p>
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="lg:col-span-2">
              {loading && (
                <div className="flex items-center justify-center h-64">
                  <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!loading && !blueprint && (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-600">
                  <p className="text-sm">날짜를 선택하면 블루프린트를 볼 수 있습니다</p>
                </div>
              )}
              {!loading && blueprint && (
                <div className="bg-white dark:bg-[#111218] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-mono font-bold text-slate-900 dark:text-white">{blueprint.date}</h3>
                    {blueprint.session_summary && (
                      <span className="text-xs text-slate-500 italic max-w-xs truncate">{blueprint.session_summary}</span>
                    )}
                  </div>

                  {blueprint.coverage && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">안정성 커버리지</p>
                      <CoverageBar value={blueprint.coverage.current} label={blueprint.coverage.description || '현재'} />
                    </div>
                  )}

                  {blueprint.pipeline && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">파이프라인</p>
                      <p className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg">{blueprint.pipeline}</p>
                    </div>
                  )}

                  {blueprint.skills && blueprint.skills.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">스킬 상태</p>
                      <div className="space-y-2">
                        {blueprint.skills.map(s => <SkillBadge key={s.name} skill={s} />)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
