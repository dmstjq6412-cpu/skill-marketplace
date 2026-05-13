import React, { useEffect, useState } from 'react';
import { fetchHarnessLogs, fetchHarnessLog, fetchHarnessBlueprints, fetchHarnessBlueprintBySkill, fetchHarnessAnalyses, fetchHarnessAnalysis, fetchHarnessReferences, deleteHarnessReference, fetchHarnessEvaluations, fetchAllHarnessEvaluations, patchHarnessEvaluation, deleteHarnessEvaluation } from '../api/client';
import MarkdownViewer from '../components/MarkdownViewer';
import HarnessCompareView from '../components/HarnessCompareView';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const GOLDEN_RULES = [
  { num: 1, title: '목적 고수', desc: '모든 결정은 "코드 통제 + 토큰 밸런스"에 기여하는가로 판단한다.' },
  { num: 2, title: '지금 문제 우선', desc: '이론적으로 좋아 보이는 것보다 지금 실제로 불편한 것을 먼저 푼다.' },
  { num: 3, title: '단순한 게 이긴다', desc: '기능이 동작하는 가장 단순한 구조에서 시작한다. 복잡한 설계가 나오면 더 단순한 방법이 없는지 먼저 물어본다. 확장은 실제 불편함이 생겼을 때만 한다.' },
  { num: 4, title: '검증 전엔 확장 없음', desc: '현재 스킬이 실전에서 잘 동작하는지 확인하기 전에 새 스킬을 추가하지 않는다.' },
];

const TEXT = {
  vizTodoLabel: '\uC5D4\uD130\uD504\uB77C\uC774\uC988 \uBC14\uC774\uBE0C \uC544\uD0A4\uD14D\uCC98',
  vizTodoHint: '\uC544\uD0A4\uD14D\uCC98, \uC6CC\uD06C\uD50C\uB85C\uC6B0 \uAD6C\uC870, TODO \uC2DC\uC2A4\uD15C \uC124\uACC4\uB97C \uB2E4\uB8EC \uB0A0\uC5D0 \uD655\uC778\uD558\uAE30 \uC88B\uC2B5\uB2C8\uB2E4.',
  vizGitLabel: 'Git Guard \uD750\uB984\uB3C4',
  vizGitHint: '\uBE0C\uB79C\uCE58 \uC804\uB7B5, \uB9AC\uBDF0 \uD750\uB984, git guard \uC790\uB3D9\uD654 \uC778\uACC4\uB97C \uB2E4\uB8EC \uB0A0\uC5D0 \uD655\uC778\uD558\uAE30 \uC88B\uC2B5\uB2C8\uB2E4.',
  vizMetaLabel: '\uBA54\uD0C0 \uD558\uB124\uC2A4 \uC2A4\uD0AC \uC778\uD130\uB799\uC158',
  vizMetaHint: '\uCF54\uC5B4 \uD558\uB124\uC2A4\uB97C \uAD00\uCC30\uD558\uACE0 \uAC1C\uC120 \uD310\uB2E8 \uADFC\uAC70\uB97C \uC313\uB294 inspecting tool \uB808\uC774\uC5B4 \uC138\uC158 \uC0AC\uC774\uD074\uACFC \uD53C\uB4DC\uBC31 \uB8E8\uD504.',
  latestSession: '\uCD5C\uC2E0',
  promptPrefix: '\uD558\uB124\uC2A4 \uC138\uC158\uC744 \uC774\uC5B4\uC11C \uC9C4\uD589\uD558\uC138\uC694.',
  summaryPrefix: '\uD604\uC7AC \uC694\uC57D:',
  promptFallback: 'wrap-up\uC744 \uBA3C\uC800 \uC77D\uACE0 \uB2E4\uC74C \uAD6C\uD604 \uB2E8\uACC4\uBD80\uD130 \uC9C4\uD589\uD558\uC138\uC694.',
  coverage: '\uCEE4\uBC84\uB9AC\uC9C0',
  changed: '\uBCC0\uACBD',
  added: '\uCD94\uAC00',
  clipboardUnavailable: '\uD074\uB9BD\uBCF4\uB4DC\uB97C \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4',
  subtitle: '\uB370\uC77C\uB9AC wrap-up\uACFC \uC5D0\uC774\uC804\uD2B8 \uC778\uACC4 \uCF58\uC194',
  todayHandoff: '\uC624\uB298 \uC778\uACC4',
  noTodayWrapup: '\uC544\uC9C1 \uC800\uC7A5\uB41C \uC624\uB298 \uAE30\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.',
  handoffHelp: 'wrap-up\uC744 \uB0A8\uAE30\uBA74 \uC778\uACC4\uAC00 \uD6E8\uC52C \uBE68\uB77C\uC9D1\uB2C8\uB2E4.',
  copyNextPrompt: '\uB2E4\uC74C \uC5D0\uC774\uC804\uD2B8 \uD504\uB86C\uD504\uD2B8 \uBCF5\uC0AC',
  openTodayLog: '\uC624\uB298 \uB85C\uADF8 \uC5F4\uAE30',
  compareYesterday: '\uC5B4\uC81C\uC640 \uBE44\uAD50',
  copiedNextPrompt: '\uB2E4\uC74C \uC5D0\uC774\uC804\uD2B8 \uD504\uB86C\uD504\uD2B8\uB97C \uBCF5\uC0AC\uD588\uC2B5\uB2C8\uB2E4',
  logsTab: '\uB370\uC77C\uB9AC \uB85C\uADF8',
  blueprintTab: '스킬 개선이력',
  vizTab: '\uC2DC\uAC01\uD654',
  analysisTab: '\uC2DC\uBC94\uC6B4\uD589',
  noAnalyses: '\uC544\uC9C1 \uC800\uC7A5\uB41C \uC2DC\uBC94\uC6B4\uD589 \uB9AC\uD3EC\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.',
  runHarnessAnalysis: '`/harness-analysis start` \uB85C \uC2DC\uBC94\uC6B4\uD589\uC744 \uC2DC\uC791\uD558\uC138\uC694.',
  pickAnalysis: '\uC67C\uCABD\uC5D0\uC11C \uB9AC\uD3EC\uD2B8\uB97C \uC120\uD0DD\uD558\uBA74 \uC138\uBD80 \uC815\uBCF4\uB97C \uBCFC \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
  reportList: '\uC2DC\uBC94\uC6B4\uD589 \uBAA9\uB85D',
  referencesTab: '\uCC38\uACE0\uC790\uB8CC',
  noReferences: '\uC800\uC7A5\uB41C \uCC38\uACE0\uC790\uB8CC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.',
  evaluationsTab: '\uD3C9\uAC00 \uC774\uB825',
  noEvaluations: '\uC800\uC7A5\uB41C \uD3C9\uAC00 \uC774\uB825\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.',
  runHarnessReference: '`/harness-reference` \uB85C \uB9C1\uD06C\uB97C \uC800\uC7A5\uD558\uC138\uC694.',
  gapsLabel: '갭',
  suggestionsLabel: '제안',
  allTags: '\uC804\uCCB4',
  logbook: '\uC138\uC158 \uB85C\uADF8\uBD81',
  noWrapups: '\uC544\uC9C1 \uC800\uC7A5\uB41C \uB370\uC77C\uB9AC wrap-up\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.',
  runHarnessLog: '`/harness-log`\uB97C \uC2E4\uD589\uD574 \uCCAB \uAE30\uB85D\uC744 \uC800\uC7A5\uD558\uC138\uC694.',
  today: '\uC624\uB298',
  pickDate: '\uC67C\uCABD\uC5D0\uC11C \uB0A0\uC9DC\uB97C \uC120\uD0DD\uD558\uBA74 wrap-up\uC744 \uBCFC \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
  copyPrompt: '\uD504\uB86C\uD504\uD2B8 \uBCF5\uC0AC',
  copyWrapup: 'Wrap-up \uBCF5\uC0AC',
  openBlueprint: '\uBE14\uB8E8\uD504\uB9B0\uD2B8 \uC5F4\uAE30',
  openViz: '\uC2DC\uAC01\uD654 \uC5F4\uAE30',
  copiedWrapup: 'wrap-up \uB9C8\uD06C\uB2E4\uC6B4\uC744 \uBCF5\uC0AC\uD588\uC2B5\uB2C8\uB2E4',
  blueprintList: '\uC2A4\uD0AC \uBAA9\uB85D',
  noBlueprints: '\uC544\uC9C1 \uC800\uC7A5\uB41C \uBE14\uB8E8\uD504\uB9B0\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.',
  generateWithHarness: '`/harness-log`\uC640 \uD568\uAED8 \uC0DD\uC131\uD574 \uBCF4\uC138\uC694.',
  pickBlueprint: '\uC67C\uCABD\uC5D0\uC11C \uC2A4\uD0AC\uC744 \uC120\uD0DD\uD558\uBA74 \uAC1C\uC120 \uD788\uC2A4\uD1A0\uB9AC\uB97C \uBCFC \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
  historyTitle: '\uAC1C\uC120 \uD788\uC2A4\uD1A0\uB9AC',
  changeLabel: '\uBCC0\uACBD',
  reasonLabel: '\uC774\uC720',
  issuesLabel: '\uC8FC\uC694 \uC7C1\uC810',
  articlesLabel: '\uCC38\uACE0 \uC544\uD2F0\uD074',
  noEntries: '\uAE30\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.',
  selectViz: '\uB370\uC77C\uB9AC \uAE30\uB85D\uACFC \uC5F0\uACB0\uB41C \uC2DC\uAC01\uD654\uB97C \uC120\uD0DD\uD558\uC138\uC694.',
};

const VIZ = {
  'todo-architecture': { label: TEXT.vizTodoLabel, hint: TEXT.vizTodoHint },
  'git-guard': { label: TEXT.vizGitLabel, hint: TEXT.vizGitHint },
  'meta-harness': { label: TEXT.vizMetaLabel, hint: TEXT.vizMetaHint },
};


const extractSection = (content, names) => {
  if (!content) return '';
  const lines = content.split('\n');
  const set = new Set(names.map(v => v.toLowerCase()));
  let on = false;
  const out = [];
  for (const line of lines) {
    if (line.startsWith('## ')) {
      const name = line.slice(3).trim().toLowerCase();
      if (on) break;
      on = set.has(name);
      continue;
    }
    if (on) out.push(line);
  }
  return out.join('\n').trim();
};

const buildPrompt = (date, summary, content) => extractSection(content, ['next prompt', 'next agent prompt', 'prompt', '\uB2E4\uC74C \uD504\uB86C\uD504\uD2B8']) || [
  `${date || TEXT.latestSession} ${TEXT.promptPrefix}`,
  summary ? `${TEXT.summaryPrefix} ${summary}` : '',
  TEXT.promptFallback,
].filter(Boolean).join('\n');

const detectViz = (blueprint, content = '') => {
  const skills = blueprint?.skills?.map(skill => skill.name) || [];
  const text = `${content} ${skills.join(' ')}`.toLowerCase();
  if (text.includes('git-guard') || skills.includes('git-guard-claude')) return 'git-guard';
  if (text.includes('architecture') || skills.includes('todo-architecture')) return 'todo-architecture';
  return null;
};


const copyText = async text => {
  if (!text || !navigator?.clipboard?.writeText) return false;
  await navigator.clipboard.writeText(text);
  return true;
};

function SkillHistoryEntry({ entry }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:bg-[#111218] p-5 space-y-3">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-slate-400">{entry.date}</span>
        <span className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
      </div>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{entry.change}</p>
      {entry.reason && (
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-600 dark:text-slate-300">{TEXT.reasonLabel}: </span>
          {entry.reason}
        </div>
      )}
      {entry.issues?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{TEXT.issuesLabel}</p>
          <div className="flex flex-wrap gap-1.5">
            {entry.issues.map((issue, i) => (
              <span key={i} className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs">{issue}</span>
            ))}
          </div>
        </div>
      )}
      {entry.articles?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{TEXT.articlesLabel}</p>
          <div className="flex flex-wrap gap-2">
            {entry.articles.map((article, i) => (
              <a key={i} href={article.url} target="_blank" rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs hover:bg-sky-100 transition-colors">
                {article.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AnalysisDetail({ report }) {
  const dur = (() => {
    try {
      const s = new Date(report.started_at);
      const e = new Date(report.ended_at);
      const mins = Math.round((e - s) / 60000);
      return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
    } catch { return '—'; }
  })();

  const secGuard = report.quality?.security_guard;
  const secColor = secGuard === 'PASS' ? 'text-green-600 bg-green-50 border-green-200' : secGuard === 'FAIL' ? 'text-red-600 bg-red-50 border-red-200' : 'text-slate-500 bg-slate-50 border-slate-200';

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111218] p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="font-mono text-xs text-slate-400">{report.date}</p>
            <p className="font-mono text-base font-semibold text-slate-900 dark:text-white mt-0.5">{report.branch}</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700 font-mono">{dur}</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '커밋', value: report.git?.commit_count ?? 0 },
            { label: '변경파일', value: report.git?.files_changed ?? 0 },
            { label: '삽입/삭제', value: `+${report.git?.insertions ?? 0} / -${report.git?.deletions ?? 0}` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-slate-50 dark:bg-slate-800/40 px-3 py-2.5 text-center">
              <p className="text-xs text-slate-400">{label}</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${secColor}`}>Security Guard: {secGuard ?? 'UNKNOWN'}</span>
          {report.quality?.test_file_ratio != null && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700">테스트 파일 비율: {(report.quality.test_file_ratio * 100).toFixed(0)}%</span>
          )}
        </div>

        {report.quality?.tokens && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">토큰 사용량</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Input', value: (report.quality.tokens.input || 0).toLocaleString() },
                { label: 'Output', value: (report.quality.tokens.output || 0).toLocaleString() },
                { label: 'Cache Read', value: (report.quality.tokens.cache_read || 0).toLocaleString() },
                { label: 'Total', value: (report.quality.tokens.total || 0).toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-slate-50 dark:bg-slate-800/40 px-3 py-2 text-center">
                  <p className="text-[10px] text-slate-400">{label}</p>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {report.quality?.token_phases && Object.keys(report.quality.token_phases).length > 0 && (() => {
          const phases = Object.entries(report.quality.token_phases).sort((a, b) => b[1] - a[1]);
          const total = phases.reduce((s, [, v]) => s + v, 0);
          const PHASE_COLORS = {
            'git-guard-claude':  { bar: 'bg-amber-400',  text: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
            'tdd-guard-claude':  { bar: 'bg-violet-400', text: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
            'security-guard':    { bar: 'bg-red-400',    text: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
            'code-reviewer':     { bar: 'bg-orange-400', text: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
          };
          const getColor = key => PHASE_COLORS[key] || { bar: 'bg-sky-400', text: 'text-sky-700', bg: 'bg-sky-50 border-sky-200' };
          return (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">구간별 토큰 포션</p>
              <div className="space-y-1.5">
                {phases.map(([phase, tokens]) => {
                  const pct = total > 0 ? (tokens / total) * 100 : 0;
                  const { bar, text, bg } = getColor(phase);
                  return (
                    <div key={phase} className="space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded border ${bg} ${text}`}>{phase}</span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {pct.toFixed(1)}% <span className="text-slate-400">({(tokens / 1000000).toFixed(1)}M)</span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {report.quality?.skill_invocations && Object.keys(report.quality.skill_invocations).length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">스킬 발동</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(report.quality.skill_invocations).map(([skill, count]) => (
                <span key={skill} className="px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-mono">
                  {skill} <span className="font-bold">×{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {report.quality?.reject_rates && Object.keys(report.quality.reject_rates).length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">REJECT 비율</p>

            <div className="flex flex-wrap gap-2">
              {Object.entries(report.quality.reject_rates).map(([skill, data]) => {
                const hasReject = data.reject > 0;
                return (
                  <span key={skill} className={`px-2.5 py-1 rounded-full border text-xs font-mono ${hasReject ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                    {skill} <span className="font-bold">{Math.round((data.rate ?? 0) * 100)}%</span>
                    <span className="opacity-60 ml-1">({data.reject}/{data.runs} REJECT)</span>
                  </span>

                );
              })}
            </div>
          </div>
        )}


        {report.quality?.efficiency && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">효율 지표</p>
              {report.quality.efficiency.overhead_flag && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-700 font-bold">OVERHEAD</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 px-3 py-2 text-center">
                <p className="text-[10px] text-slate-400">가드/LOC</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                  {report.quality.efficiency.guard_invocations_per_loc ?? '—'}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 px-3 py-2 text-center">
                <p className="text-[10px] text-slate-400">전체/LOC</p>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                  {report.quality.efficiency.total_invocations_per_loc ?? '—'}
                </p>
              </div>
            </div>
            {report.quality.efficiency.baseline_avg != null && (
              <p className="text-[10px] text-slate-400 font-mono">baseline avg: {report.quality.efficiency.baseline_avg}</p>
            )}
          </div>
        )}


        {report.pr && (
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">PR #{report.pr.number}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{report.pr.title}</p>
            </div>
            <a href={report.pr.url} target="_blank" rel="noopener noreferrer"
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors">
              {report.pr.state}
            </a>
          </div>
        )}
      </div>

      {report.git?.commits?.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111218] p-5 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">커밋 목록</p>
          <div className="space-y-1">
            {report.git.commits.map((c, i) => (
              <div key={i} className="flex items-start gap-2">
                <code className="shrink-0 text-[11px] font-mono text-slate-400 mt-0.5">{c.hash?.slice(0, 7)}</code>
                <p className="text-xs text-slate-600 dark:text-slate-300">{c.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HarnessLabPage() {
  const [tab, setTab] = useState('logs');
  const [logs, setLogs] = useState([]);
  const [skillList, setSkillList] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [skillHistory, setSkillHistory] = useState(null);
  const [skillEvaluations, setSkillEvaluations] = useState([]);
  const [logContent, setLogContent] = useState('');
  const [activeViz, setActiveViz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const [analysisList, setAnalysisList] = useState([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [analysisDetail, setAnalysisDetail] = useState(null);
  const [references, setReferences] = useState([]);
  const [activeTag, setActiveTag] = useState(null);
  const [evalDecisionLoading, setEvalDecisionLoading] = useState(null);
  const [allEvaluations, setAllEvaluations] = useState([]);
  const [evalSkillFilter, setEvalSkillFilter] = useState(null);

  const [analysisView, setAnalysisView] = useState('list');


  useEffect(() => {
    fetchHarnessLogs().then(data => setLogs(data.logs || []));
    fetchHarnessBlueprints().then(data => setSkillList(data.skills || []));
    fetchHarnessAnalyses().then(data => setAnalysisList(data.reports || []));
    fetchHarnessReferences().then(data => setReferences(data.references || []));
    fetchAllHarnessEvaluations().then(data => setAllEvaluations(data.evaluations || []));
  }, []);

  const todayLog = logs[0];
  const selectedSummary = logs.find(log => log.date === selectedDate)?.summary || '';
  const prompt = buildPrompt(selectedDate, selectedSummary, logContent);
  const blueprintViz = detectViz({}, logContent);
  const todayPrompt = buildPrompt(todayLog?.date, todayLog?.summary, '');

  const openLog = async date => {
    setSelectedDate(date);
    setLoading(true);
    const data = await fetchHarnessLog(date);
    setLogContent(data.content || '');
    setLoading(false);
  };

  const openSkillHistory = async skill => {
    setSelectedSkill(skill);
    setLoading(true);
    const [historyData, evalData] = await Promise.all([
      fetchHarnessBlueprintBySkill(skill),
      fetchHarnessEvaluations(skill).catch(() => ({ evaluations: [] })),
    ]);
    setSkillHistory(historyData);
    setSkillEvaluations(evalData.evaluations || []);
    setLoading(false);
  };

  const openAnalysis = async id => {
    setSelectedAnalysis(id);
    setLoading(true);
    const data = await fetchHarnessAnalysis(id);
    setAnalysisDetail(data);
    setLoading(false);
  };

  const handleGapDecision = async (ev, gapIndex, decision) => {
    const key = `${ev.id}-${gapIndex}`;
    setEvalDecisionLoading(key);
    const existing = (ev.gap_decisions || []).filter(d => !(d.index === gapIndex && d.type === 'gap'));
    const next = [...existing, { index: gapIndex, type: 'gap', decision }];
    try {
      await patchHarnessEvaluation(ev.id, next);
      setSkillEvaluations(prev => prev.map(e => e.id === ev.id ? { ...e, gap_decisions: next } : e));
    } finally {
      setEvalDecisionLoading(null);
    }
  };

  const handleDeleteEvaluation = async id => {
    await deleteHarnessEvaluation(id);
    setSkillEvaluations(prev => prev.filter(e => e.id !== id));
  };

  const handleAllEvalGapDecision = async (ev, gapIndex, decision) => {
    const key = `${ev.id}-${gapIndex}`;
    setEvalDecisionLoading(key);
    const existing = (ev.gap_decisions || []).filter(d => !(d.index === gapIndex && d.type === 'gap'));
    const next = [...existing, { index: gapIndex, type: 'gap', decision }];
    try {
      await patchHarnessEvaluation(ev.id, next);
      setAllEvaluations(prev => prev.map(e => e.id === ev.id ? { ...e, gap_decisions: next } : e));
    } finally {
      setEvalDecisionLoading(null);
    }
  };

  const handleAllDeleteEvaluation = async id => {
    await deleteHarnessEvaluation(id);
    setAllEvaluations(prev => prev.filter(e => e.id !== id));
  };

  const handleCopy = async (text, message) => {
    const ok = await copyText(text);
    setCopyStatus(ok ? message : TEXT.clipboardUnavailable);
  };

  return (
    <div className="max-w-7xl mx-auto px-5 py-8 space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Harness Lab</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">{TEXT.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-mono">
          {['tdd-guard-claude', 'security-guard', 'git-guard-claude', 'todo-architecture'].map(skill => <span key={skill} className="px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200">{skill}</span>)}
        </div>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">Golden Rule</span>
            <span className="text-xs text-amber-500 dark:text-amber-500">— 일관적인 코드 통제와 토큰 사용량의 밸런스</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {GOLDEN_RULES.map(rule => (
              <div key={rule.num} className="flex gap-3 rounded-xl bg-white/70 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20 px-3 py-2.5">
                <span className="shrink-0 text-xs font-bold text-amber-400 mt-0.5">{rule.num}</span>
                <div>
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">{rule.title}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{rule.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111218] p-5 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">{TEXT.todayHandoff}</p>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{todayLog?.summary || TEXT.noTodayWrapup}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{TEXT.handoffHelp}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button type="button" className="px-3 py-2 rounded-lg bg-violet-600 text-white text-sm" disabled={!todayLog} onClick={() => handleCopy(todayPrompt, TEXT.copiedNextPrompt)}>{TEXT.copyNextPrompt}</button>
              <button type="button" className="px-3 py-2 rounded-lg border text-sm" disabled={!todayLog} onClick={() => openLog(todayLog.date)}>{TEXT.openTodayLog}</button>
              <button type="button" className="px-3 py-2 rounded-lg border text-sm" onClick={() => setTab('blueprint')}>{TEXT.blueprintTab}</button>
            </div>
          </div>
          {copyStatus && <p className="text-xs text-violet-600 dark:text-violet-400">{copyStatus}</p>}
        </section>
      </div>

      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl w-fit flex-wrap">
        {[['logs', TEXT.logsTab], ['blueprint', TEXT.blueprintTab], ['viz', TEXT.vizTab], ['analysis', TEXT.analysisTab], ['references', TEXT.referencesTab], ['evaluations', TEXT.evaluationsTab]].map(([key, label]) => (
          <button key={key} type="button" onClick={() => { setTab(key); setCopyStatus(''); if (key !== 'viz') setActiveViz(null); }} className={`px-4 py-2 text-sm rounded-lg ${tab === key ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}>{label}</button>
        ))}
      </div>

      {tab === 'logs' && <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          <h2 className="text-xs uppercase tracking-wider text-slate-400">{TEXT.logbook}</h2>
          {logs.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400"><p>{TEXT.noWrapups}</p><p className="text-xs mt-1 font-mono">{TEXT.runHarnessLog}</p></div> : logs.map((log, index) => <button key={log.date} type="button" onClick={() => openLog(log.date)} className="w-full text-left px-4 py-3 rounded-xl border bg-white dark:bg-[#111218]"><div className="flex justify-between gap-2"><span className="font-mono text-sm">{log.date}</span>{index === 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">{TEXT.today}</span>}</div><p className="text-xs text-slate-500 mt-1">{log.summary}</p></button>)}
        </div>
        <div className="lg:col-span-2 space-y-4">
          {loading && <div className="h-40 flex items-center justify-center"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>}
          {!loading && !logContent && <div className="h-64 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400">{TEXT.pickDate}</div>}
          {!loading && !!logContent && <>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111218] p-4 space-y-3">
              <div className="flex gap-2 flex-wrap">
                <button type="button" className="px-3 py-2 rounded-lg bg-violet-600 text-white text-sm" onClick={() => handleCopy(prompt, TEXT.copiedNextPrompt)}>{TEXT.copyPrompt}</button>
                <button type="button" className="px-3 py-2 rounded-lg border text-sm" onClick={() => handleCopy(logContent, TEXT.copiedWrapup)}>{TEXT.copyWrapup}</button>
                <button type="button" className="px-3 py-2 rounded-lg border text-sm" onClick={() => setTab('blueprint')}>{TEXT.openBlueprint}</button>
                {blueprintViz && <button type="button" className="px-3 py-2 rounded-lg border text-sm" onClick={() => { setTab('viz'); setActiveViz(blueprintViz); }}>{TEXT.openViz}</button>}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111218] p-6"><MarkdownViewer content={logContent} /></div>
          </>}
        </div>
      </div>}

      {tab === 'blueprint' && <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          <h2 className="text-xs uppercase tracking-wider text-slate-400">{TEXT.blueprintList}</h2>
          {skillList.length === 0
            ? <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400"><p>{TEXT.noBlueprints}</p><p className="text-xs mt-1 font-mono">{TEXT.generateWithHarness}</p></div>
            : skillList.map(item => (
              <button key={item.skill} type="button" onClick={() => openSkillHistory(item.skill)}
                className={`w-full text-left px-4 py-3 rounded-xl border bg-white dark:bg-[#111218] hover:border-violet-200 transition-colors ${selectedSkill === item.skill ? 'border-violet-400' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{item.skill}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{item.entry_count}회</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 truncate">{item.latest?.change}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{item.latest?.date}</p>
              </button>
            ))
          }
        </div>

        <div className="lg:col-span-2">
          {loading && <div className="h-40 flex items-center justify-center"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>}
          {!loading && !skillHistory && <div className="h-64 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400">{TEXT.pickBlueprint}</div>}
          {!loading && !!skillHistory && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <h3 className="font-mono text-lg font-bold text-slate-900 dark:text-white">{skillHistory.skill}</h3>
              </div>

              {/* 평가 이력 */}
              {skillEvaluations.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">아티클 인사이트</p>
                  {skillEvaluations.map((ev, i) => {
                    const isInsightFormat = ev.insights?.length > 0;
                    const verdictStyle = v => v === 'pass' ? 'bg-green-50 border-green-200 text-green-700' : v === 'needs-work' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-amber-50 border-amber-200 text-amber-700';
                    return (
                      <div key={i} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-4 space-y-2.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <a href={ev.article_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-violet-600 transition-colors">
                            {ev.article_title}
                          </a>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-slate-400">{ev.date}</span>
                            {!isInsightFormat && ev.verdict && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${verdictStyle(ev.verdict)}`}>{ev.verdict}</span>
                            )}
                            <button type="button" onClick={() => handleDeleteEvaluation(ev.id)}
                              className="text-[10px] text-slate-300 hover:text-red-400 transition-colors leading-none" aria-label="삭제">✕</button>
                          </div>
                        </div>

                        {/* 새 형식: insights */}
                        {isInsightFormat && (
                          <ul className="space-y-1.5">
                            {ev.insights.map((insight, j) => (
                              <li key={j} className="flex gap-1.5 items-start text-xs text-slate-600 dark:text-slate-400">
                                <span className="text-violet-300 shrink-0 mt-0.5">·</span>
                                <span>{insight}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* 구 형식: verdict/gaps/suggestions */}
                        {!isInsightFormat && ev.gaps?.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">갭</p>
                            <ul className="space-y-1.5">
                              {ev.gaps.map((g, j) => {
                                const dec = (ev.gap_decisions || []).find(d => d.index === j && d.type === 'gap');
                                const isLoading = evalDecisionLoading === `${ev.id}-${j}`;
                                const decStyle = dec?.decision === 'adopt'
                                  ? 'bg-green-100 text-green-700 border-green-200'
                                  : dec?.decision === 'skip'
                                  ? 'bg-gray-100 text-gray-500 border-gray-200'
                                  : dec?.decision === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                  : null;
                                return (
                                  <li key={j} className="text-xs text-slate-600 dark:text-slate-400">
                                    <div className="flex gap-1.5 items-start">
                                      <span className="text-slate-300 shrink-0">·</span>
                                      <span className="flex-1">{g}</span>
                                      {decStyle && (
                                        <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded border font-semibold ${decStyle}`}>
                                          {dec.decision}
                                          {dec.issue_number && <span className="ml-1 opacity-70">#{dec.issue_number}</span>}
                                        </span>
                                      )}
                                    </div>
                                    {!dec && (
                                      <div className="flex gap-1 mt-1 ml-3">
                                        <button type="button" disabled={isLoading}
                                          onClick={() => handleGapDecision(ev, j, 'adopt')}
                                          className="text-[10px] px-2 py-0.5 rounded border border-green-200 text-green-600 hover:bg-green-50 disabled:opacity-40 transition-colors">
                                          adopt
                                        </button>
                                        <button type="button" disabled={isLoading}
                                          onClick={() => handleGapDecision(ev, j, 'skip')}
                                          className="text-[10px] px-2 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                                          skip
                                        </button>
                                      </div>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                        {!isInsightFormat && ev.suggestions?.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">제안</p>
                            <ul className="space-y-0.5">
                              {ev.suggestions.map((s, j) => <li key={j} className="text-xs text-violet-600 dark:text-violet-400 before:content-['→'] before:mr-1.5">{s}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 개선 히스토리 */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{TEXT.historyTitle}</p>
                {skillHistory.entries?.length === 0
                  ? <p className="text-sm text-slate-400">{TEXT.noEntries}</p>
                  : skillHistory.entries.map((entry, i) => <SkillHistoryEntry key={i} entry={entry} />)
                }
              </div>
            </div>
          )}
        </div>
      </div>}

      {tab === 'analysis' && <div className="space-y-4">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-lg w-fit">
          {[['list', '목록'], ['compare', '비교']].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setAnalysisView(key)}
              className={`px-3 py-1.5 text-xs rounded-md ${analysisView === key ? 'bg-white dark:bg-slate-700 shadow-sm font-medium' : 'text-slate-500'}`}>
              {label}
            </button>
          ))}
        </div>

        {analysisView === 'list' && <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h2 className="text-xs uppercase tracking-wider text-slate-400">{TEXT.reportList}</h2>
            {analysisList.length === 0
              ? <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400"><p>{TEXT.noAnalyses}</p><p className="text-xs mt-1 font-mono">{TEXT.runHarnessAnalysis}</p></div>
              : analysisList.map(r => (
                <button key={r.id} type="button" onClick={() => openAnalysis(r.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border bg-white dark:bg-[#111218] hover:border-violet-200 transition-colors ${selectedAnalysis === r.id ? 'border-violet-400' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{r.date}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{r.git?.commit_count ?? 0}커밋</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-mono truncate">{r.branch}</p>
                </button>
              ))
            }
          </div>

          <div className="lg:col-span-2">
            {loading && <div className="h-40 flex items-center justify-center"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>}
            {!loading && !analysisDetail && <div className="h-64 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400">{TEXT.pickAnalysis}</div>}
            {!loading && !!analysisDetail && <AnalysisDetail report={analysisDetail} />}
          </div>
        </div>}

        {analysisView === 'compare' && <HarnessCompareView reports={analysisList} loading={loading} />}
      </div>}

      {tab === 'references' && (() => {
        const allTags = [...new Set(references.flatMap(r => r.tags || []))].sort();
        const filtered = activeTag ? references.filter(r => (r.tags || []).includes(activeTag)) : references;
        const handleDelete = async (id) => {
          await deleteHarnessReference(id);
          setReferences(prev => prev.filter(r => r.id !== id));
        };
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <button type="button" onClick={() => setActiveTag(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${!activeTag ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-500 hover:border-violet-300'}`}>
                {TEXT.allTags}
              </button>
              {allTags.map(tag => (
                <button key={tag} type="button" onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${activeTag === tag ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-500 hover:border-violet-300'}`}>
                  {tag}
                </button>
              ))}
            </div>
            {filtered.length === 0
              ? <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
                  <p>{TEXT.noReferences}</p>
                  <p className="text-xs mt-1 font-mono">{TEXT.runHarnessReference}</p>
                </div>
              : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map(ref => {
                    const verdictStyle = v => v === 'pass' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : v === 'needs-work' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200';
                    return (
                      <div key={ref.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111218] p-4 space-y-3 flex flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <a href={ref.url} target="_blank" rel="noopener noreferrer"
                            className="text-sm font-semibold text-slate-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 transition-colors leading-snug">
                            {ref.title}
                          </a>
                          <button type="button" onClick={() => handleDelete(ref.id)}
                            className="shrink-0 text-slate-300 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                        </div>
                        {ref.summary && <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed flex-1">{ref.summary}</p>}
                        <div className="flex flex-wrap gap-1.5">
                          {(ref.tags || []).map(tag => (
                            <button key={tag} type="button" onClick={() => setActiveTag(tag)}
                              className="px-2 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-[11px] hover:bg-violet-100 transition-colors">
                              {tag}
                            </button>
                          ))}
                        </div>
                        {(ref.evaluations || []).length > 0 && (
                          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">스킬 평가</p>
                            {ref.evaluations.map((ev, i) => (
                              <div key={i} className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300">{ev.skill}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${verdictStyle(ev.verdict)}`}>{ev.verdict}</span>
                                </div>
                                <ul className="space-y-0.5 ml-1">
                                  {(ev.gaps || []).map((gap, j) => (
                                    <li key={j} className="text-[11px] text-slate-500 dark:text-slate-400 flex gap-1">
                                      <span className="text-slate-300 shrink-0">·</span>{gap}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] text-slate-300 dark:text-slate-600 font-mono">{new Date(ref.created_at).toLocaleDateString('ko-KR')}</p>
                      </div>
                    );
                  })}
                </div>
            }
          </div>
        );
      })()}

      {tab === 'viz' && <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">{Object.entries(VIZ).map(([key, item]) => <button key={key} type="button" onClick={() => setActiveViz(key)} className="text-left px-4 py-4 rounded-2xl border bg-white dark:bg-[#111218]"><p className="text-sm font-semibold">{item.label}</p><p className="mt-1 text-xs text-slate-500">{item.hint}</p></button>)}</div>
        {!activeViz ? <div className="h-80 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400">{TEXT.selectViz}</div> : <div className="space-y-3"><p className="text-sm text-slate-500">{VIZ[activeViz].hint}</p><div className="rounded-2xl border border-slate-200 overflow-hidden bg-white" style={{ height: '78vh' }}><iframe key={activeViz} src={`/viz/${activeViz}.html`} className="w-full h-full border-0" title={activeViz} sandbox="allow-scripts allow-same-origin" /></div></div>}
      </div>}

      {tab === 'evaluations' && (() => {
        const evalSkills = [...new Set(allEvaluations.map(e => e.skill))];
        const filteredEvals = evalSkillFilter ? allEvaluations.filter(e => e.skill === evalSkillFilter) : allEvaluations;
        return (
          <div className="space-y-4">
            {evalSkills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {evalSkills.map(skill => (
                  <button key={skill} type="button" onClick={() => setEvalSkillFilter(evalSkillFilter === skill ? null : skill)}
                    className={`px-3 py-1.5 rounded-full text-xs font-mono font-semibold border transition-colors ${evalSkillFilter === skill ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-500 hover:border-violet-300'}`}>
                    {skill}
                  </button>
                ))}
              </div>
            )}
            {filteredEvals.length === 0
              ? <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400"><p>{TEXT.noEvaluations}</p></div>
              : <div className="space-y-3">
                  {filteredEvals.map(ev => {
                    const verdictStyle = v => v === 'pass' ? 'bg-green-50 border-green-200 text-green-700' : v === 'needs-work' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-amber-50 border-amber-200 text-amber-700';
                    return (
                      <div key={ev.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111218] p-4 space-y-2.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <a href={ev.article_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-violet-600 transition-colors">
                            {ev.article_title}
                          </a>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-slate-400">{ev.date}</span>
                            <span className="font-mono text-[10px] text-slate-500">{ev.skill}</span>
                            {ev.verdict && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${verdictStyle(ev.verdict)}`}>{ev.verdict}</span>
                            )}
                            <button type="button" onClick={() => handleAllDeleteEvaluation(ev.id)}
                              className="text-[10px] text-slate-300 hover:text-red-400 transition-colors leading-none" aria-label="평가 삭제">✕</button>
                          </div>
                        </div>
                        {ev.gaps?.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">갭</p>
                            <ul className="space-y-1.5">
                              {ev.gaps.map((g, j) => {
                                const dec = (ev.gap_decisions || []).find(d => d.index === j && d.type === 'gap');
                                const isLoading = evalDecisionLoading === `${ev.id}-${j}`;
                                const decStyle = dec?.decision === 'adopt'
                                  ? 'bg-green-100 text-green-700 border-green-200'
                                  : dec?.decision === 'skip'
                                  ? 'bg-gray-100 text-gray-500 border-gray-200'
                                  : dec?.decision === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                  : null;
                                return (
                                  <li key={j} className="text-xs text-slate-600 dark:text-slate-400">
                                    <div className="flex gap-1.5 items-start">
                                      <span className="text-slate-300 shrink-0">·</span>
                                      <span className="flex-1">{g}</span>
                                      {decStyle && (
                                        <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded border font-semibold ${decStyle}`}>
                                          {dec.decision}
                                          {dec.issue_number && <span className="ml-1 opacity-70">#{dec.issue_number}</span>}
                                        </span>
                                      )}
                                    </div>
                                    {!dec && (
                                      <div className="flex gap-1 mt-1 ml-3">
                                        <button type="button" disabled={isLoading}
                                          onClick={() => handleAllEvalGapDecision(ev, j, 'adopt')}
                                          className="text-[10px] px-2 py-0.5 rounded border border-green-200 text-green-600 hover:bg-green-50 disabled:opacity-40 transition-colors">
                                          adopt
                                        </button>
                                        <button type="button" disabled={isLoading}
                                          onClick={() => handleAllEvalGapDecision(ev, j, 'skip')}
                                          className="text-[10px] px-2 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                                          skip
                                        </button>
                                      </div>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
            }
          </div>
        );
      })()}
    </div>
  );
}

