import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import SkillListPage from './pages/SkillListPage';
import SkillDetailPage from './pages/SkillDetailPage';
import UploadPage from './pages/UploadPage';
import HarnessLabPage from './pages/HarnessLabPage';
import { fetchMe, getGithubLoginUrl, exchangeAuthCode } from './api/client';

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

function AuthCallback({ onLogin }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) { navigate('/'); return; }
    exchangeAuthCode(code)
      .then(({ token }) => {
        localStorage.setItem('jwt_token', token);
        return fetchMe();
      })
      .then((user) => {
        onLogin(user);
        navigate('/');
      })
      .catch(() => navigate('/'));
  }, []);

  return <div className="flex items-center justify-center min-h-screen text-slate-400">로그인 처리 중...</div>;
}

export default function App() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [user, setUser] = useState(null);
  const location = useLocation();


  // 로그인 상태 복원
  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    if (!token) return;
    fetchMe().then(setUser).catch(() => {
      localStorage.removeItem('jwt_token');
    });
  }, []);

  function handleLogout() {
    localStorage.removeItem('jwt_token');
    setUser(null);
  }

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
  const isLab = location.pathname === '/lab';

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
                !isUpload && !isLab
                  ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Browse
            </Link>
            <Link
              to="/lab"
              className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-150 ${
                isLab
                  ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Harness Lab
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

            {/* GitHub 로그인 */}
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{user.username}</span>
                <button
                  onClick={handleLogout}
                  className="text-xs px-2.5 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-150"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <a
                href={getGithubLoginUrl()}
                className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-white transition-colors duration-150"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                GitHub 로그인
              </a>
            )}

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
          <Route path="/lab" element={<HarnessLabPage />} />
          <Route path="/auth/callback" element={<AuthCallback onLogin={setUser} />} />
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
