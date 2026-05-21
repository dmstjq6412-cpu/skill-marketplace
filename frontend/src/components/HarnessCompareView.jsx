import React, { useState } from 'react';

const PHASE_ORDER = ['baseline', 'tdd-guard-claude', 'git-guard-claude', 'security-guard', 'harness-analysis'];
const SKILL_OPTIONS = ['전체', ...PHASE_ORDER.filter(p => p !== 'baseline')];

const PHASE_COLORS = {
  'baseline':        'bg-slate-400',
  'tdd-guard-claude': 'bg-indigo-500',
  'git-guard-claude': 'bg-violet-500',
  'security-guard':  'bg-rose-500',
  'harness-analysis': 'bg-amber-500',
};

const PHASE_DOT_COLORS = {
  'baseline':        'bg-slate-400',
  'tdd-guard-claude': 'bg-indigo-500',
  'git-guard-claude': 'bg-violet-500',
  'security-guard':  'bg-rose-500',
  'harness-analysis': 'bg-amber-500',
};

function hasReject(report) {
  const rates = report.quality?.reject_rates || {};
  return Object.values(rates).some(r => r.reject > 0);
}

function TokenBar({ tokenPhases }) {
  const total = PHASE_ORDER.reduce((sum, p) => sum + (tokenPhases[p] || 0), 0);
  if (total === 0) return <div className="h-5 w-full bg-slate-100 rounded" />;

  return (
    <div className="flex h-5 w-full rounded overflow-hidden">
      {PHASE_ORDER.map(phase => {
        const value = tokenPhases[phase] || 0;
        const pct = (value / total) * 100;
        if (pct < 0.5) return null;
        return (
          <div
            key={phase}
            data-phase={phase}
            aria-label={`${phase}: ${value.toLocaleString()}`}
            className={`${PHASE_COLORS[phase]} h-full`}
            style={{ width: `${pct}%` }}
            title={`${phase}: ${value.toLocaleString()} (${pct.toFixed(1)}%)`}
          />
        );
      })}
    </div>
  );
}

function LineChart({ reports, selectedSkill }) {
  const sorted = [...reports].sort((a, b) => a.date.localeCompare(b.date));

  const values = sorted.map(r => {
    if (selectedSkill === '전체') {
      return r.quality?.efficiency?.guard_invocations_per_loc ?? 0;
    }
    return r.quality?.token_phases?.[selectedSkill] ?? 0;
  });

  const max = Math.max(...values, 0.01);
  const W = 300;
  const H = 80;
  const PAD_X = 36;
  const PAD_Y = 18;
  const n = sorted.length;

  const pts = values.map((v, i) => ({
    x: n === 1 ? W / 2 : PAD_X + (i / (n - 1)) * (W - PAD_X - 10),
    y: PAD_Y + ((1 - v / max) * (H - PAD_Y - 14)),
    v,
  }));

  const yZero = PAD_Y + (H - PAD_Y - 14);
  const maxLabel = selectedSkill === '전체' ? max.toFixed(2) : max.toLocaleString();
  const fmt = v => selectedSkill === '전체' ? v.toFixed(2) : v.toLocaleString();

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="추이 그래프">
      {/* Y축 기준선 */}
      <line x1={PAD_X} y1={PAD_Y} x2={PAD_X} y2={yZero} stroke="#e2e8f0" strokeWidth="1" />
      {/* Y축 라벨 — max */}
      <text x={PAD_X - 4} y={PAD_Y + 4} textAnchor="end" fontSize="9" fill="#94a3b8">{maxLabel}</text>
      {/* Y축 라벨 — 0 */}
      <text x={PAD_X - 4} y={yZero + 1} textAnchor="end" fontSize="9" fill="#94a3b8" data-testid="y-axis-zero">0</text>
      {/* 0 기준선 */}
      <line x1={PAD_X} y1={yZero} x2={W - 4} y2={yZero} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />

      {n > 1 && (
        <polyline
          points={pts.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#6366f1"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}
      {pts.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r="4"
            fill="#6366f1"
            data-testid="line-point"
            aria-label={`${sorted[i].date}: ${fmt(p.v)}`}
          />
          <text
            x={p.x}
            y={p.y - 7}
            textAnchor="middle"
            fontSize="9"
            fill="#6366f1"
            data-testid="line-value-label"
          >
            {fmt(p.v)}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function HarnessCompareView({ reports = [], loading = false }) {
  const [selectedSkill, setSelectedSkill] = useState('전체');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400" aria-busy="true">
        로딩 중...
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 text-sm">
        비교할 리포트가 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 범례 */}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {PHASE_ORDER.map(phase => (
          <div key={phase} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={`w-2.5 h-2.5 rounded-sm ${PHASE_DOT_COLORS[phase]}`} />
            {phase}
          </div>
        ))}
      </div>

      {/* run별 스택 막대 */}
      <div className="space-y-4">
        {reports.map(report => (
          <div key={report.date} className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-slate-600 dark:text-slate-300 w-24 shrink-0">
                {report.date}
              </span>
              {hasReject(report) && (
                <span
                  data-testid="reject-badge"
                  className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-semibold tracking-wide"
                >
                  REJECT
                </span>
              )}
              {report.policy && (
                <span className="text-[11px] text-slate-400 truncate max-w-xs">
                  {report.policy}
                </span>
              )}
            </div>
            <TokenBar tokenPhases={report.quality?.token_phases || {}} />
            <div className="text-[10px] text-slate-400 text-right font-mono">
              {(report.quality?.tokens?.total || 0).toLocaleString()} tokens
              {report.quality?.efficiency?.loc
                ? ` · ${report.quality.efficiency.loc} LOC`
                : ''}
            </div>
          </div>
        ))}
      </div>

      {/* 꺾은선: 추이 */}
      <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {selectedSkill === '전체' ? '가드 호출 / LOC 추이' : `${selectedSkill} 토큰 추이`}
          </p>
          <div className="flex flex-wrap gap-1">
            {SKILL_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => setSelectedSkill(opt)}
                data-selected={selectedSkill === opt ? 'true' : 'false'}
                aria-pressed={selectedSkill === opt}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                  selectedSkill === opt
                    ? 'bg-indigo-500 text-white border-indigo-500'
                    : 'text-slate-500 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <LineChart reports={reports} selectedSkill={selectedSkill} />
        <div className="flex justify-between text-[10px] text-slate-400 font-mono px-1">
          {[...reports].sort((a, b) => a.date.localeCompare(b.date)).map(r => (
            <span key={r.date}>{r.date.slice(5)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
