import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import SkillListPage from './pages/SkillListPage';
import SkillDetailPage from './pages/SkillDetailPage';
import UploadPage from './pages/UploadPage';

function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
    </svg>
  );
}

export default function App() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const location = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  const isUpload = location.pathname === '/upload';

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-[#09090f]" style={{ transition: 'background-color 0.3s ease' }}>
      {/* Header */}
      <header className="glass bg-white/85 dark:bg-[#111218]/85 border-b border-slate-200/70 dark:border-slate-800/70 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-5 py-3.5 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-violet-500/30 group-hover:shadow-violet-500/50 transition-shadow duration-200">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display font-bold text-[15px] text-slate-900 dark:text-white tracking-tight">
                Skill
                <span className="text-violet-600 dark:text-violet-400"> Marketplace</span>
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-wider">Claude Code Skills</span>
            </div>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-2">
            <Link
              to="/"
              className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-150 ${
                !isUpload
                  ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Browse
            </Link>
            <Link
              to="/upload"
              className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-150 ${
                isUpload
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
                  : 'bg-violet-600 text-white hover:bg-violet-700 shadow-sm shadow-violet-500/25 hover:shadow-violet-500/40'
              }`}
            >
              Upload Skill
            </Link>

            {/* Theme toggle */}
            <button
              onClick={() => setDark(d => !d)}
              className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors duration-150 text-slate-500 dark:text-amber-400"
              aria-label="Toggle dark mode"
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<SkillListPage />} />
          <Route path="/skills/:id" element={<SkillDetailPage />} />
          <Route path="/upload" element={<UploadPage />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/60 py-6">
        <div className="max-w-7xl mx-auto px-5 flex items-center justify-between text-xs text-slate-400 dark:text-slate-600">
          <span className="font-display font-semibold tracking-tight text-slate-500 dark:text-slate-500">
            Skill Marketplace
          </span>
          <span>Claude Code Skills — Built for developers</span>
        </div>
      </footer>
    </div>
  );
}
