import React from 'react';

const PHASE_ORDER = ['baseline', 'tdd-guard-claude', 'git-guard-claude', 'security-guard', 'harness-analysis'];

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

function LineChart({ reports }) {
  const values = reports.map(r => r.quality?.efficiency?.guard_invocations_per_loc ?? 0);
  const max = Math.max(...values, 0.01);
  const W = 300;
  const H = 64;
  const PAD = 10;
  const n = reports.length;

  const pts = values.map((v, i) => ({
    x: n === 1 ? W / 2 : PAD + (i / (n - 1)) * (W - PAD * 2),
    y: H - PAD - ((v / max) * (H - PAD * 2)),
    v,
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="tokens/LOC 추이">
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
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="4"
          fill="#6366f1"
          data-testid="line-point"
          aria-label={`${reports[i].date}: ${p.v.toFixed(3)}`}
        />
      ))}
    </svg>
  );
}

export default function HarnessCompareView({ reports = [], loading = false }) {
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

      {/* 꺾은선: 가드 호출/LOC 추이 */}
      <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          가드 호출 / LOC 추이
        </p>
        <LineChart reports={reports} />
        <div className="flex justify-between text-[10px] text-slate-400 font-mono px-1">
          {reports.map(r => (
            <span key={r.date}>{r.date.slice(5)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
