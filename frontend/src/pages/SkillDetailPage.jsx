import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchSkill, getDownloadUrl } from '../api/client';
import MarkdownViewer from '../components/MarkdownViewer';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
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
      <div className="flex justify-center py-32">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500 text-lg">{error || 'Skill not found'}</p>
        <button onClick={() => navigate('/')} className="mt-4 text-indigo-600 hover:underline text-sm">
          ← Back to marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-indigo-600 transition-colors">Marketplace</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{skill.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
            {/* Icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl
                            flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>

            <h1 className="text-xl font-bold text-gray-900">{skill.name}</h1>
            <p className="text-gray-500 text-sm mt-1">{skill.author}</p>

            {skill.description && (
              <p className="text-gray-600 text-sm mt-3">{skill.description}</p>
            )}

            {/* Meta */}
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Version</span>
                <span className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-xs">
                  v{skill.version}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Downloads</span>
                <span className="font-medium">{skill.downloads.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Registered</span>
                <span className="font-medium">{formatDate(skill.created_at)}</span>
              </div>
              {skill.updated_at && skill.updated_at !== skill.created_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Updated</span>
                  <span className="font-medium">{formatDate(skill.updated_at)}</span>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="mt-6 space-y-2">
              <a
                href={getDownloadUrl(id)}
                download={`${skill.name}.${skill.file_type === 'zip' ? 'zip' : 'md'}`}
                className="flex items-center justify-center gap-2 w-full bg-indigo-600 text-white
                           font-medium py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </a>
              <Link
                to={`/upload?update=${encodeURIComponent(skill.name)}`}
                className="flex items-center justify-center gap-2 w-full border border-gray-200
                           text-gray-700 font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
                </svg>
                Upload Update
              </Link>
            </div>

            {/* CLI hint */}
            <div className="mt-4 bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 font-medium mb-1">Install via CLI</p>
              <code className="text-xs font-mono text-gray-700 break-all">
                skill-marketplace install {id}
              </code>
            </div>

            {/* Manual install */}
            <details className="mt-3">
              <summary className="text-xs text-gray-500 font-medium cursor-pointer hover:text-gray-700 select-none">
                수동 설치 방법
              </summary>
              <div className="mt-2 text-xs text-gray-600 space-y-2">
                {skill.file_type === 'zip' ? (
                  <>
                    <p className="text-gray-500">이 스킬은 프로그램 파일을 포함합니다.</p>
                    <ol className="space-y-1.5 list-decimal list-inside">
                      <li>위 <strong>Download</strong> 버튼으로 <code className="bg-gray-100 px-1 rounded">{skill.name}.zip</code> 다운로드</li>
                      <li>아래 경로에 압축 해제:
                        <code className="block bg-gray-100 px-2 py-1 rounded mt-1 break-all">~/.claude/skills/{skill.name}/</code>
                      </li>
                      <li><code className="bg-gray-100 px-1 rounded">package.json</code>이 있으면 해당 폴더에서 실행:
                        <code className="block bg-gray-100 px-2 py-1 rounded mt-1">npm install</code>
                      </li>
                      <li>Claude Code 재시작 후 <code className="bg-gray-100 px-1 rounded">/{skill.name}</code> 로 사용</li>
                    </ol>
                  </>
                ) : (
                  <>
                    <ol className="space-y-1.5 list-decimal list-inside">
                      <li>위 <strong>Download</strong> 버튼으로 <code className="bg-gray-100 px-1 rounded">{skill.name}.md</code> 다운로드</li>
                      <li>아래 경로에 폴더 생성:
                        <code className="block bg-gray-100 px-2 py-1 rounded mt-1 break-all">~/.claude/skills/{skill.name}/</code>
                      </li>
                      <li>다운로드한 파일을 아래 경로로 이동:
                        <code className="block bg-gray-100 px-2 py-1 rounded mt-1 break-all">~/.claude/skills/{skill.name}/SKILL.md</code>
                      </li>
                      <li>Claude Code 재시작 후 <code className="bg-gray-100 px-1 rounded">/{skill.name}</code> 로 사용</li>
                    </ol>
                  </>
                )}
              </div>
            </details>
          </div>
        </div>

        {/* README + Version History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              README
            </h2>
            <MarkdownViewer content={skill.readme} />
          </div>

          {/* Version History */}
          {skill.versions && skill.versions.length > 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Version History
              </h2>
              <div className="divide-y divide-gray-100">
                {skill.versions.map((v, i) => (
                  <div key={v.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/skills/${v.id}`}
                        className="font-mono text-sm font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded hover:bg-indigo-100 transition-colors"
                      >
                        v{v.version}
                      </Link>
                      {i === 0 && (
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          latest
                        </span>
                      )}
                      <span className="text-sm text-gray-500">{formatDate(v.created_at)}</span>
                    </div>
                    <span className="text-sm text-gray-400">{v.downloads.toLocaleString()} downloads</span>
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
