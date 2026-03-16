import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getDownloadUrl } from '../api/client';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

export default function SkillCard({ id, name, version, author, description, downloads, created_at }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/skills/${id}`)}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 cursor-pointer
                 hover:shadow-md hover:border-indigo-200 transition-all duration-200 flex flex-col gap-3"
    >
      {/* Icon + Name */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl
                        flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{name}</h3>
          <p className="text-sm text-gray-500 truncate">{author}</p>
        </div>
        <span className="text-xs bg-indigo-50 text-indigo-700 font-mono px-2 py-1 rounded-full flex-shrink-0">
          v{version}
        </span>
      </div>

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-600 line-clamp-2">{description}</p>
      )}

      {/* Meta */}
      <div className="flex items-center justify-between text-xs text-gray-400 mt-auto">
        <span>{formatDate(created_at)}</span>
        <div className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>{downloads.toLocaleString()}</span>
        </div>
      </div>

      {/* Download button */}
      <a
        href={getDownloadUrl(id)}
        download={`${name}.md`}
        onClick={e => e.stopPropagation()}
        className="mt-1 w-full text-center bg-indigo-600 text-white text-sm font-medium
                   py-2 rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Download
      </a>
    </div>
  );
}
