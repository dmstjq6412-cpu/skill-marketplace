import React from 'react';

export default function SearchBar({ value, onChange, placeholder = 'Search skills...' }) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
        fill="none" viewBox="0 0 24 24" stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm
                   focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                   text-gray-900 placeholder-gray-400"
      />
    </div>
  );
}
