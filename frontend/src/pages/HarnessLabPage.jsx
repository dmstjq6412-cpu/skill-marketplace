import React, { useEffect, useMemo, useState } from 'react';
import { fetchHarnessLogs, fetchHarnessLog, fetchHarnessBlueprints, fetchHarnessBlueprint, fetchHarnessBlueprintDiff } from '../api/client';
import MarkdownViewer from '../components/MarkdownViewer';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const TEXT = {
  vizTodoLabel: '\uC5D4\uD130\uD504\uB77C\uC774\uC988 \uBC14\uC774\uBE0C \uC544\uD0A4\uD14D\uCC98',
  vizTodoHint: '\uC544\uD0A4\uD14D\uCC98, \uC6CC\uD06C\uD50C\uB85C\uC6B0 \uAD6C\uC870, TODO \uC2DC\uC2A4\uD15C \uC124\uACC4\uB97C \uB2E4\uB8EC \uB0A0\uC5D0 \uD655\uC778\uD558\uAE30 \uC88B\uC2B5\uB2C8\uB2E4.',
  vizGitLabel: 'Git Guard \uD750\uB984\uB3C4',
  vizGitHint: '\uBE0C\uB79C\uCE58 \uC804\uB7B5, \uB9AC\uBDF0 \uD750\uB984, git guard \uC790\uB3D9\uD654 \uC778\uACC4\uB97C \uB2E4\uB8EC \uB0A0\uC5D0 \uD655\uC778\uD558\uAE30 \uC88B\uC2B5\uB2C8\uB2E4.',
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
  blueprintTab: '\uBE14\uB8E8\uD504\uB9B0\uD2B8',
  vizTab: '\uC2DC\uAC01\uD654',
  logbook: '\uC138\uC158 \uB85C\uADF8\uBD81',
  noWrapups: '\uC544\uC9C1 \uC800\uC7A5\uB41C \uB370\uC77C\uB9AC wrap-up\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.',
  runHarnessLog: '`/harness-log`\uB97C \uC2E4\uD589\uD574 \uCCAB \uAE30\uB85D\uC744 \uC800\uC7A5\uD558\uC138\uC694.',
  today: '\uC624\uB298',
  pickDate: '\uC67C\uCABD\uC5D0\uC11C \uB0A0\uC9DC\uB97C \uC120\uD0DD\uD558\uBA74 wrap-up\uC744 \uBCFC \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
  copyPrompt: '\uD504\uB86C\uD504\uD2B8 \uBCF5\uC0AC',
  copyWrapup: 'Wrap-up \uBCF5\uC0AC',
  openBlueprint: '\uBE14\uB8E8\uD504\uB9B0\uD2B8 \uC5F4\uAE30',
  wrapupGuideTitle: '\uCD94\uCC9C wrap-up \uAD6C\uC131',
  wrapupSection1: '\uC624\uB298 \uB17C\uC758',
  wrapupSection2: '\uC624\uB298 \uAD6C\uD604',
  wrapupSection3: '\uACB0\uC815\uD55C \uAC83',
  wrapupSection4: '\uB9C9\uD78C \uC810',
  wrapupSection5: '\uB0B4\uC77C \uBC14\uB85C \uD560 \uC77C',
  openViz: '\uC2DC\uAC01\uD654 \uC5F4\uAE30',
  copiedWrapup: 'wrap-up \uB9C8\uD06C\uB2E4\uC6B4\uC744 \uBCF5\uC0AC\uD588\uC2B5\uB2C8\uB2E4',
  checklist1: '1. \uC624\uB298 \uBC14\uB010 \uC810\uC744 \uC801\uC2B5\uB2C8\uB2E4.',
  checklist2: '2. \uC624\uB298 \uC2E4\uC81C\uB85C \uAD6C\uD604\uD55C \uAC83\uC744 \uC815\uB9AC\uD569\uB2C8\uB2E4.',
  checklist3: '3. \uC624\uB298 \uB0B4\uB9B0 \uACB0\uC815\uACFC \uB0A8\uC740 \uB9C9\uD78C \uC810\uC744 \uB0A8\uAE41\uB2C8\uB2E4.',
  checklist4: '4. \uB0B4\uC77C \uBC14\uB85C \uC2DC\uC791\uD560 \uC791\uC5C5\uACFC \uD504\uB86C\uD504\uD2B8\uB97C \uB0A8\uAE41\uB2C8\uB2E4.',
  from: '\uAE30\uC900\uC77C',
  to: '\uBE44\uAD50\uC77C',
  pickDateOption: '\uB0A0\uC9DC \uC120\uD0DD',
  refreshDiff: '\uBE44\uAD50 \uC0C8\uB85C\uACE0\uCE68',
  blueprintList: '\uBE14\uB8E8\uD504\uB9B0\uD2B8 \uBAA9\uB85D',
  noBlueprints: '\uC544\uC9C1 \uC800\uC7A5\uB41C \uBE14\uB8E8\uD504\uB9B0\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.',
  generateWithHarness: '`/harness-log`\uC640 \uD568\uAED8 \uC0DD\uC131\uD574 \uBCF4\uC138\uC694.',
  pickBlueprint: '\uB0A0\uC9DC\uB97C \uC120\uD0DD\uD558\uBA74 \uD574\uB2F9 \uC2DC\uC810\uC758 \uC0C1\uD0DC \uC2A4\uB0C5\uC0F7\uC744 \uBCFC \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
  openRelatedViz: '\uC5F0\uACB0\uB41C \uC2DC\uAC01\uD654 \uC5F4\uAE30',
  selectViz: '\uB370\uC77C\uB9AC \uAE30\uB85D\uACFC \uC5F0\uACB0\uB41C \uC2DC\uAC01\uD654\uB97C \uC120\uD0DD\uD558\uC138\uC694.',
  done: '\uC644\uB8CC',
  inProgress: '\uC9C4\uD589 \uC911',
  todo: '\uB300\uAE30',
  totalSkills: '\uC804\uCCB4 \uC2A4\uD0AC',
  completedSkills: '\uC644\uB8CC',
  progressRate: '\uC9C4\uD589\uB960',
  pendingSkills: '\uB300\uAE30',
  pipelineLabel: '\uD30C\uC774\uD504\uB77C\uC778',
  statusOverview: '\uC0C1\uD0DC \uC694\uC57D',
  skillStatusTitle: '\uC2A4\uD0AC \uC9C4\uD589 \uC0C1\uD0DC',
};

const VIZ = {
  'todo-architecture': { label: TEXT.vizTodoLabel, hint: TEXT.vizTodoHint },
  'git-guard': { label: TEXT.vizGitLabel, hint: TEXT.vizGitHint },
};

const STATUS_META = {
  DONE: {
    label: TEXT.done,
    chip: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    card: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    dot: 'bg-emerald-500',
  },
  IN_PROGRESS: {
    label: TEXT.inProgress,
    chip: 'bg-sky-100 text-sky-700 border-sky-200',
    card: 'bg-sky-50 border-sky-200 text-sky-800',
    dot: 'bg-sky-500',
  },
  TODO: {
    label: TEXT.todo,
    chip: 'bg-amber-100 text-amber-700 border-amber-200',
    card: 'bg-amber-50 border-amber-200 text-amber-800',
    dot: 'bg-amber-500',
  },
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

const diffSummary = diff => {
  if (!diff) return [];
  const coverage = (diff.coverage_after?.current || 0) - (diff.coverage_before?.current || 0);
  const changed = diff.changes.filter(item => item.type === 'changed').length;
  const added = diff.changes.filter(item => item.type === 'added').length;
  return [`${TEXT.coverage} ${coverage >= 0 ? '+' : ''}${coverage}%`, `${TEXT.changed} ${changed}`, `${TEXT.added} ${added}`];
};

const copyText = async text => {
  if (!text || !navigator?.clipboard?.writeText) return false;
  await navigator.clipboard.writeText(text);
  return true;
};

function CoverageBar({ value }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{TEXT.coverage}</span>
        <span className="font-semibold text-slate-700">{value}%</span>
      </div>
      <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-sky-500 to-emerald-500" style={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }} />
      </div>
    </div>
  );
}

function ProgressRing({ value }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const normalized = Math.max(0, Math.min(100, value || 0));
  const offset = circumference - (normalized / 100) * circumference;

  return (
    <div className="relative h-28 w-28">
      <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-slate-900">{normalized}%</span>
        <span className="text-[11px] text-slate-500">{TEXT.progressRate}</span>
      </div>
    </div>
  );
}

function StatusCard({ label, count, tone }) {
  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <p className="text-[11px] font-semibold tracking-[0.18em] uppercase opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-bold">{count}</p>
    </div>
  );
}

function SkillStatusItem({ skill }) {
  const meta = STATUS_META[skill.status] || STATUS_META.TODO;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-slate-900 break-all">{skill.name}</p>
          {skill.version && <p className="mt-1 text-xs text-slate-400">{skill.version}</p>}
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.chip}`}>{meta.label}</span>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
        <span>{meta.label}</span>
      </div>
    </div>
  );
}

export default function HarnessLabPage() {
  const [tab, setTab] = useState('logs');
  const [logs, setLogs] = useState([]);
  const [blueprints, setBlueprints] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [logContent, setLogContent] = useState('');
  const [blueprint, setBlueprint] = useState(null);
  const [diff, setDiff] = useState(null);
  const [diffFrom, setDiffFrom] = useState('');
  const [diffTo, setDiffTo] = useState('');
  const [activeViz, setActiveViz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');

  useEffect(() => {
    fetchHarnessLogs().then(data => setLogs(data.logs || []));
    fetchHarnessBlueprints().then(data => setBlueprints(data.blueprints || []));
  }, []);

  useEffect(() => {
    if (blueprints.length >= 2 && !diffFrom && !diffTo) {
      setDiffFrom(blueprints[1].date);
      setDiffTo(blueprints[0].date);
    }
  }, [blueprints, diffFrom, diffTo]);

  useEffect(() => {
    if (tab !== 'blueprint' || !diffFrom || !diffTo) return;
    fetchHarnessBlueprintDiff(diffFrom, diffTo).then(setDiff);
  }, [tab, diffFrom, diffTo]);

  const todayLog = logs[0];
  const todayBlueprint = blueprints[0];
  const selectedSummary = logs.find(log => log.date === selectedDate)?.summary || '';
  const prompt = buildPrompt(selectedDate, selectedSummary, logContent);
  const blueprintViz = detectViz(blueprint, logContent);
  const todayPrompt = buildPrompt(todayLog?.date, todayLog?.summary, '');
  const chips = useMemo(() => diffSummary(diff), [diff]);

  const blueprintStats = useMemo(() => {
    const skills = blueprint?.skills || [];
    const total = skills.length;
    const done = skills.filter(skill => skill.status === 'DONE').length;
    const inProgress = skills.filter(skill => skill.status === 'IN_PROGRESS').length;
    const todo = skills.filter(skill => skill.status === 'TODO').length;
    const progress = total > 0 ? Math.round(((done + inProgress * 0.5) / total) * 100) : blueprint?.coverage?.current || 0;
    return { total, done, inProgress, todo, progress };
  }, [blueprint]);

  const openLog = async date => {
    setSelectedDate(date);
    setLoading(true);
    const data = await fetchHarnessLog(date);
    setLogContent(data.content || '');
    setLoading(false);
  };

  const openBlueprint = async date => {
    setSelectedDate(date);
    setLoading(true);
    const data = await fetchHarnessBlueprint(date);
    setBlueprint(data);
    setLoading(false);
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
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111218] p-5 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">{TEXT.todayHandoff}</p>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{todayLog?.summary || TEXT.noTodayWrapup}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{todayBlueprint?.session_summary || TEXT.handoffHelp}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button type="button" className="px-3 py-2 rounded-lg bg-violet-600 text-white text-sm" disabled={!todayLog} onClick={() => handleCopy(todayPrompt, TEXT.copiedNextPrompt)}>{TEXT.copyNextPrompt}</button>
              <button type="button" className="px-3 py-2 rounded-lg border text-sm" disabled={!todayLog} onClick={() => openLog(todayLog.date)}>{TEXT.openTodayLog}</button>
              <button type="button" className="px-3 py-2 rounded-lg border text-sm" disabled={!todayBlueprint} onClick={() => setTab('blueprint')}>{TEXT.compareYesterday}</button>
            </div>
          </div>
          {copyStatus && <p className="text-xs text-violet-600 dark:text-violet-400">{copyStatus}</p>}
        </section>
      </div>

      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl w-fit">
        {[['logs', TEXT.logsTab], ['blueprint', TEXT.blueprintTab], ['viz', TEXT.vizTab]].map(([key, label]) => (
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
                <button type="button" className="px-3 py-2 rounded-lg border text-sm" onClick={() => { setTab('blueprint'); if (selectedDate) openBlueprint(selectedDate); }}>{TEXT.openBlueprint}</button>
                {blueprintViz && <button type="button" className="px-3 py-2 rounded-lg border text-sm" onClick={() => { setTab('viz'); setActiveViz(blueprintViz); }}>{TEXT.openViz}</button>}
              </div>
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{TEXT.wrapupGuideTitle}</p>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="rounded-xl bg-white/80 dark:bg-slate-950/40 px-3 py-3 text-sm text-slate-700 dark:text-slate-300">
                    <p className="font-semibold text-slate-900 dark:text-white">{TEXT.wrapupSection1}</p>
                    <p className="mt-1">{TEXT.checklist1}</p>
                  </div>
                  <div className="rounded-xl bg-white/80 dark:bg-slate-950/40 px-3 py-3 text-sm text-slate-700 dark:text-slate-300">
                    <p className="font-semibold text-slate-900 dark:text-white">{TEXT.wrapupSection2}</p>
                    <p className="mt-1">{TEXT.checklist2}</p>
                  </div>
                  <div className="rounded-xl bg-white/80 dark:bg-slate-950/40 px-3 py-3 text-sm text-slate-700 dark:text-slate-300">
                    <p className="font-semibold text-slate-900 dark:text-white">{TEXT.wrapupSection3}</p>
                    <p className="mt-1">{TEXT.checklist3}</p>
                  </div>
                  <div className="rounded-xl bg-white/80 dark:bg-slate-950/40 px-3 py-3 text-sm text-slate-700 dark:text-slate-300">
                    <p className="font-semibold text-slate-900 dark:text-white">{TEXT.wrapupSection4}</p>
                    <p className="mt-1">{TEXT.checklist4}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/70 px-3 py-3 text-sm text-violet-900 dark:bg-violet-500/10 dark:text-violet-100">
                  <p className="font-semibold">{TEXT.wrapupSection5}</p>
                  <p className="mt-1">{TEXT.copyNextPrompt}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111218] p-6"><MarkdownViewer content={logContent} /></div>
          </>}
        </div>
      </div>}

      {tab === 'blueprint' && <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111218] p-5 space-y-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div><label className="text-xs text-slate-500">{TEXT.from}</label><select value={diffFrom} onChange={e => setDiffFrom(e.target.value)} className="block mt-1 px-3 py-2 rounded-lg border"><option value="">{TEXT.pickDateOption}</option>{blueprints.map(item => <option key={item.date} value={item.date}>{item.date}</option>)}</select></div>
            <div><label className="text-xs text-slate-500">{TEXT.to}</label><select value={diffTo} onChange={e => setDiffTo(e.target.value)} className="block mt-1 px-3 py-2 rounded-lg border"><option value="">{TEXT.pickDateOption}</option>{blueprints.map(item => <option key={item.date} value={item.date}>{item.date}</option>)}</select></div>
            <button type="button" className="px-3 py-2 rounded-lg bg-violet-600 text-white text-sm disabled:opacity-40" disabled={!diffFrom || !diffTo} onClick={() => fetchHarnessBlueprintDiff(diffFrom, diffTo).then(setDiff)}>{TEXT.refreshDiff}</button>
          </div>
          <div className="flex gap-2 flex-wrap">{chips.map(chip => <span key={chip} className="px-2.5 py-1 rounded-full bg-slate-100 text-xs text-slate-600">{chip}</span>)}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h2 className="text-xs uppercase tracking-wider text-slate-400">{TEXT.blueprintList}</h2>
            {blueprints.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400"><p>{TEXT.noBlueprints}</p><p className="text-xs mt-1 font-mono">{TEXT.generateWithHarness}</p></div> : blueprints.map(item => <button key={item.date} type="button" onClick={() => openBlueprint(item.date)} className="w-full text-left px-4 py-3 rounded-xl border bg-white dark:bg-[#111218] hover:border-violet-200 transition-colors"><span className="font-mono text-sm">{item.date}</span><p className="text-xs text-slate-400 mt-1">{TEXT.coverage} {item.coverage?.current}%</p><p className="text-xs text-slate-500 mt-1">{item.session_summary}</p></button>)}
          </div>

          <div className="lg:col-span-2">
            {!blueprint ? (
              <div className="h-64 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400">{TEXT.pickBlueprint}</div>
            ) : (
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 md:p-7 space-y-6 shadow-sm">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="font-mono text-lg font-bold text-slate-900">{blueprint.date}</h3>
                    <p className="text-sm text-slate-500 mt-1">{blueprint.session_summary}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {blueprintViz && <button type="button" className="px-3 py-2 rounded-lg border text-sm" onClick={() => { setTab('viz'); setActiveViz(blueprintViz); }}>{TEXT.openRelatedViz}</button>}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[160px_1fr] items-center rounded-3xl bg-slate-50 border border-slate-200 p-5">
                  <div className="flex justify-center">
                    <ProgressRing value={blueprintStats.progress} />
                  </div>
                  <div className="space-y-4">
                    <CoverageBar value={blueprint.coverage?.current || 0} />
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <StatusCard label={TEXT.totalSkills} count={blueprintStats.total} tone="bg-slate-100 border-slate-200 text-slate-800" />
                      <StatusCard label={TEXT.completedSkills} count={blueprintStats.done} tone={STATUS_META.DONE.card} />
                      <StatusCard label={TEXT.progressRate} count={`${blueprintStats.inProgress}`} tone={STATUS_META.IN_PROGRESS.card} />
                      <StatusCard label={TEXT.pendingSkills} count={blueprintStats.todo} tone={STATUS_META.TODO.card} />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.1fr_1.4fr]">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{TEXT.pipelineLabel}</p>
                      <p className="mt-2 text-sm font-mono text-slate-700 break-words">{blueprint.pipeline}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{TEXT.statusOverview}</p>
                      <div className="mt-3 space-y-3">
                        {['DONE', 'IN_PROGRESS', 'TODO'].map(status => {
                          const count = status === 'DONE' ? blueprintStats.done : status === 'IN_PROGRESS' ? blueprintStats.inProgress : blueprintStats.todo;
                          const total = blueprintStats.total || 1;
                          const width = Math.round((count / total) * 100);
                          const meta = STATUS_META[status];
                          return (
                            <div key={status} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-700">{meta.label}</span>
                                <span className="text-slate-500">{count}</span>
                              </div>
                              <div className="h-2.5 rounded-full bg-white overflow-hidden border border-slate-200">
                                <div className={`h-full ${meta.dot}`} style={{ width: `${width}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{TEXT.skillStatusTitle}</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      {blueprint.skills?.map(skill => <SkillStatusItem key={skill.name} skill={skill} />)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>}

      {tab === 'viz' && <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">{Object.entries(VIZ).map(([key, item]) => <button key={key} type="button" onClick={() => setActiveViz(key)} className="text-left px-4 py-4 rounded-2xl border bg-white dark:bg-[#111218]"><p className="text-sm font-semibold">{item.label}</p><p className="mt-1 text-xs text-slate-500">{item.hint}</p></button>)}</div>
        {!activeViz ? <div className="h-80 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400">{TEXT.selectViz}</div> : <div className="space-y-3"><p className="text-sm text-slate-500">{VIZ[activeViz].hint}</p><div className="rounded-2xl border border-slate-200 overflow-hidden bg-white" style={{ height: '78vh' }}><iframe key={activeViz} src={`${API_BASE}/harness/html/${activeViz}`} className="w-full h-full border-0" title={activeViz} sandbox="allow-scripts allow-same-origin" /></div></div>}
      </div>}
    </div>
  );
}

