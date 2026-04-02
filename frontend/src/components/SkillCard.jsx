import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getDownloadUrl } from '../api/client';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric'
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

export default function SkillCard({ id, name, version, author, description, downloads, created_at }) {
  const navigate = useNavigate();
  const gradient = getGradient(name || '');

  return (
    <div
      onClick={() => navigate(`/skills/${id}`)}
      className="card-glow group bg-white dark:bg-[#111218] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 cursor-pointer flex flex-col gap-3 hover:border-violet-300 dark:hover:border-violet-800/60 hover:shadow-lg dark:hover:shadow-none transition-all duration-200 animate-fade-in-up"
    >
      {/* Icon + Name row */}
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-md`}
             style={{ boxShadow: `0 4px 12px rgba(139,92,246,0.25)` }}>
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100 truncate text-[15px] tracking-tight">{name}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-500 truncate mt-0.5">{author}</p>
        </div>
        <span className="text-[11px] font-mono font-medium bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 px-2 py-0.5 rounded-full flex-shrink-0 border border-violet-200/60 dark:border-violet-500/20">
          v{version}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm line-clamp-2 leading-relaxed min-h-[2.5rem]">
        {description
          ? <span className="text-slate-500 dark:text-slate-400">{description}</span>
          : <span className="text-slate-300 dark:text-slate-600 italic">No description provided.</span>
        }
      </p>

      {/* Meta */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-600 mt-auto pt-1 border-t border-slate-100 dark:border-slate-800/60">
        <span>{formatDate(created_at)}</span>
        <div className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>{downloads.toLocaleString()}</span>
        </div>
      </div>

      {/* Download button */}
      <a
        href={getDownloadUrl(id)}
        download={`${name}.md`}
        onClick={e => e.stopPropagation()}
        className="mt-0.5 w-full text-center bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2 rounded-xl transition-colors duration-150 shadow-sm shadow-violet-500/20 group-hover:shadow-violet-500/30"
      >
        Download
      </a>
    </div>
  );
}
