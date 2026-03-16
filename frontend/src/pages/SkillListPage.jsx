import React, { useState, useEffect, useCallback } from 'react';
import { fetchSkills } from '../api/client';
import SearchBar from '../components/SearchBar';
import SkillCard from '../components/SkillCard';

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

  // Debounce search
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Skill Marketplace</h1>
        <p className="text-gray-500">Discover and download Claude Code skills</p>
      </div>

      {/* Search */}
      <div className="max-w-2xl mx-auto mb-8">
        <SearchBar value={search} onChange={setSearch} placeholder="Search skills by name..." />
      </div>

      {/* Result count */}
      {!loading && (
        <p className="text-sm text-gray-500 mb-4">
          {total === 0 ? 'No skills found' : `${total} skill${total !== 1 ? 's' : ''} found`}
          {search && ` for "${search}"`}
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : skills.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-medium">No skills found</p>
          <p className="text-sm mt-1">Try a different search or upload a new skill</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {skills.map(skill => (
            <SkillCard key={skill.id} {...skill} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg border text-sm font-medium
                       disabled:opacity-40 disabled:cursor-not-allowed
                       hover:bg-gray-100 transition-colors"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg border text-sm font-medium
                       disabled:opacity-40 disabled:cursor-not-allowed
                       hover:bg-gray-100 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
