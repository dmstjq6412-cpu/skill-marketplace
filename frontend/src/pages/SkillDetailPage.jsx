import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchSkill, getDownloadUrl } from '../api/client';
import MarkdownViewer from '../components/MarkdownViewer';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

const ICON_GRADIENTS = [
  'from-violet-500 to-indigo-600',
  'from-fuchsia-500 to-violet-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-rose-500 to-pink-600',
];

function getGradient(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return ICON_GRADIENTS[Math.abs(hash) % ICON_GRADIENTS.length];
}

export default function SkillDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [skill, setSkill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSkill(id)
      .then(setSkill)
      .catch(() => setError('Skill not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-violet-600/30 dark:border-violet-400/20 border-t-violet-600 dark:border-t-violet-400 animate-spin" />
          <span className="text-sm text-slate-400 dark:text-slate-600 font-mono">Loading skill…</span>
        </div>
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div className="max-w-xl mx-auto px-5 py-28 text-center">
        <div className="w-14 h-14 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <p className="font-display font-semibold text-slate-700 dark:text-slate-300 text-lg mb-1">{error || 'Skill not found'}</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 text-sm font-medium transition-colors"
        >
          ← Back to marketplace
        </button>
      </div>
    );
  }

  const gradient = getGradient(skill.name || '');

  return (
    <div className="max-w-5xl mx-auto px-5 py-8 animate-fade-in-up">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-7">
        <Link to="/" className="text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors font-medium">
          Marketplace
        </Link>
        <svg className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{skill.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar */}
        <div>
          <div className="bg-white dark:bg-[#111218] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-6 sticky top-24 shadow-sm dark:shadow-none">
            {/* Icon */}
            <div
              className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center mb-5 shadow-lg`}
              style={{ boxShadow: '0 8px 24px rgba(139,92,246,0.3)' }}
            >
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>

            {/* Name */}
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight mb-1">
              {skill.name}
            </h1>

            {/* Author */}
            <div className="flex items-center gap-1.5 mb-4">
              <svg className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <span className="text-sm text-slate-500 dark:text-slate-500">{skill.author}</span>
            </div>

            {/* Description */}
            {skill.description && (
              <div className="mb-4 bg-violet-50 dark:bg-violet-500/8 border border-violet-100 dark:border-violet-500/15 rounded-xl px-4 py-3">
                <p className="text-[10px] font-semibold text-violet-500 dark:text-violet-500 uppercase tracking-widest mb-1.5">Description</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{skill.description}</p>
              </div>
            )}

            {/* Meta */}
            <div className="space-y-2.5 text-sm mb-5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 dark:text-slate-600">Version</span>
                <span className="font-mono text-xs font-medium text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 border border-violet-200/60 dark:border-violet-500/20 px-2 py-0.5 rounded-full">
                  v{skill.version}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 dark:text-slate-600">Downloads</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{skill.downloads.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 dark:text-slate-600">Registered</span>
                <span className="text-slate-600 dark:text-slate-400 text-xs">{formatDate(skill.created_at)}</span>
              </div>
              {skill.updated_at && skill.updated_at !== skill.created_at && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 dark:text-slate-600">Updated</span>
                  <span className="text-slate-600 dark:text-slate-400 text-xs">{formatDate(skill.updated_at)}</span>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="space-y-2">
              <a
                href={getDownloadUrl(id)}
                download={`${skill.name}.${skill.file_type === 'zip' ? 'zip' : 'md'}`}
                className="flex items-center justify-center gap-2 w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-2.5 rounded-xl transition-colors duration-150 text-sm shadow-sm shadow-violet-500/25"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </a>
              <Link
                to={`/upload?update=${encodeURIComponent(skill.name)}`}
                className="flex items-center justify-center gap-2 w-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium py-2.5 rounded-xl transition-all duration-150 text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
                </svg>
                Upload Update
              </Link>
            </div>

            {/* CLI hint */}
            <div className="mt-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1.5">Install via CLI</p>
              <code className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all">
                skill-marketplace install {id}
              </code>
            </div>

            {/* Manual install */}
            <details className="mt-3 group">
              <summary className="text-xs text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 font-medium cursor-pointer select-none flex items-center gap-1.5 transition-colors">
                <svg className="w-3 h-3 group-open:rotate-90 transition-transform duration-150" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                수동 설치 방법
              </summary>
              <div className="mt-3 text-xs text-slate-500 dark:text-slate-500 space-y-2 pl-4 border-l-2 border-slate-100 dark:border-slate-800">
                {skill.file_type === 'zip' ? (
                  <>
                    <p className="text-slate-400 dark:text-slate-600">이 스킬은 프로그램 파일을 포함합니다.</p>
                    <ol className="space-y-2 list-decimal list-inside">
                      <li>위 <strong className="text-slate-600 dark:text-slate-400">Download</strong> 버튼으로 <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-violet-700 dark:text-violet-400">{skill.name}.zip</code> 다운로드</li>
                      <li>아래 경로에 압축 해제:
                        <code className="block bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1.5 rounded-lg mt-1 break-all text-slate-700">~/.claude/skills/{skill.name}/</code>
                      </li>
                      <li><code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-violet-700 dark:text-violet-400">package.json</code>이 있으면 실행:
                        <code className="block bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1.5 rounded-lg mt-1 text-slate-700">npm install</code>
                      </li>
                      <li>Claude Code 재시작 후 <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-violet-700 dark:text-violet-400">/{skill.name}</code> 로 사용</li>
                    </ol>
                  </>
                ) : (
                  <ol className="space-y-2 list-decimal list-inside">
                    <li>위 <strong className="text-slate-600 dark:text-slate-400">Download</strong> 버튼으로 <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-violet-700 dark:text-violet-400">{skill.name}.md</code> 다운로드</li>
                    <li>아래 경로에 폴더 생성:
                      <code className="block bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1.5 rounded-lg mt-1 break-all text-slate-700">~/.claude/skills/{skill.name}/</code>
                    </li>
                    <li>다운로드한 파일을 이동:
                      <code className="block bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1.5 rounded-lg mt-1 break-all text-slate-700">~/.claude/skills/{skill.name}/SKILL.md</code>
                    </li>
                    <li>Claude Code 재시작 후 <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-violet-700 dark:text-violet-400">/{skill.name}</code> 로 사용</li>
                  </ol>
                )}
              </div>
            </details>
          </div>
        </div>

        {/* Main content */}
        <div className="space-y-5">
          {/* README */}
          <div className="bg-white dark:bg-[#111218] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm dark:shadow-none">
            <h2 className="font-display text-base font-semibold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <svg className="w-4 h-4 text-slate-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              README
            </h2>
            <MarkdownViewer content={skill.readme} />
          </div>

          {/* Version History */}
          {skill.versions && skill.versions.length > 1 && (
            <div className="bg-white dark:bg-[#111218] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm dark:shadow-none">
              <h2 className="font-display text-base font-semibold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
                <svg className="w-4 h-4 text-slate-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Version History
              </h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {skill.versions.map((v, i) => (
                  <div key={v.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/skills/${v.id}`}
                        className="font-mono text-xs font-semibold text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 border border-violet-200/60 dark:border-violet-500/20 px-2.5 py-1 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors"
                      >
                        v{v.version}
                      </Link>
                      {i === 0 && (
                        <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 px-2 py-0.5 rounded-full">
                          latest
                        </span>
                      )}
                      <span className="text-sm text-slate-400 dark:text-slate-600">{formatDate(v.created_at)}</span>
                    </div>
                    <span className="text-xs text-slate-400 dark:text-slate-600 font-mono">{v.downloads.toLocaleString()} dl</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
