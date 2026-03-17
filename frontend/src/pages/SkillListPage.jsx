import React, { useState, useEffect, useCallback } from 'react';
import { fetchSkills } from '../api/client';
import SearchBar from '../components/SearchBar';
import SkillCard from '../components/SkillCard';

function LoadingSkeleton() {
  return (
    <div className="bg-white dark:bg-[#111218] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse w-3/4" />
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-1/2" />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-4/5" />
      </div>
      <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse mt-auto" />
    </div>
  );
}

export default function SkillListPage() {
  const [skills, setSkills] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (q, p) => {
    setLoading(true);
    try {
      const data = await fetchSkills(q, p);
      setSkills(data.skills);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      load(search, 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, load]);

  useEffect(() => {
    load(search, page);
  }, [page]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      {/* Hero section */}
      <div className="hero-gradient border-b border-slate-200/50 dark:border-slate-800/40 pb-10 pt-14">
        <div className="max-w-7xl mx-auto px-5">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-violet-50 dark:bg-violet-500/10 border border-violet-200/60 dark:border-violet-500/20 text-violet-700 dark:text-violet-400 text-xs font-medium px-3 py-1.5 rounded-full mb-5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 dark:bg-violet-400 animate-pulse" />
              Claude Code Skills Registry
            </div>
            <h1 className="font-display text-4xl font-bold text-slate-900 dark:text-white tracking-tight leading-[1.1] mb-3">
              Discover & Install
              <br />
              <span className="text-violet-600 dark:text-violet-400">Claude Skills</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed mb-8">
              Browse community-built skills to extend your Claude Code capabilities.
            </p>
            <SearchBar value={search} onChange={setSearch} placeholder="Search skills by name or author..." />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-5 py-8">
        {/* Stats bar */}
        <div className="flex items-center justify-between mb-6">
          {!loading && (
            <p className="text-sm text-slate-500 dark:text-slate-500">
              {total === 0 ? 'No skills found' : (
                <>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{total}</span>
                  {` skill${total !== 1 ? 's' : ''}`}
                  {search && <> matching <span className="text-violet-600 dark:text-violet-400 font-medium">"{search}"</span></>}
                </>
              )}
            </p>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <LoadingSkeleton key={i} />)}
          </div>
        ) : skills.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="font-display font-semibold text-slate-700 dark:text-slate-300 text-lg mb-1">No skills found</p>
            <p className="text-sm text-slate-400 dark:text-slate-600">Try a different search term or upload a new skill</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {skills.map((skill, i) => (
              <div key={skill.id} style={{ animationDelay: `${i * 40}ms` }}>
                <SkillCard {...skill} />
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-[#111218] hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Prev
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-xl text-sm font-medium transition-all duration-150 ${
                      page === p
                        ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-[#111218] hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
            >
              Next
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
