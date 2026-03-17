import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { uploadSkill } from '../api/client';

export default function UploadPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const updateName = searchParams.get('update') || '';

  const [form, setForm] = useState({
    name: updateName,
    version: '1.0.0',
    author: '',
    description: '',
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleFile = f => {
    if (f && (f.name.endsWith('.md') || f.name.endsWith('.zip'))) {
      setFile(f);
      setError(null);
    } else if (f) {
      setError('Please select a .md or .zip file');
    }
  };

  const handleDrop = e => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!file) return setError('Please select a .md or .zip file');

    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => formData.append(k, v));
    formData.append('skill_file', file);

    setLoading(true);
    setError(null);
    try {
      const { id } = await uploadSkill(formData);
      navigate(`/skills/${id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-white dark:bg-[#0e0f16] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 dark:focus:border-violet-600 transition-all duration-150 font-sans";
  const labelCls = "block text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1.5";

  return (
    <div className="max-w-2xl mx-auto px-5 py-10 animate-fade-in-up">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-8">
        <Link to="/" className="text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors font-medium">
          Marketplace
        </Link>
        <svg className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-slate-700 dark:text-slate-300 font-medium">
          {updateName ? `Update "${updateName}"` : 'Upload Skill'}
        </span>
      </nav>

      <div className="bg-white dark:bg-[#111218] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-8 shadow-sm dark:shadow-none">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-violet-500/25">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
              </svg>
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {updateName ? `Update "${updateName}"` : 'Upload New Skill'}
              </h1>
              <p className="text-xs text-slate-400 dark:text-slate-600 mt-0.5">
                {updateName ? 'Upload a new version of this skill' : 'Share your skill with the community'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Skill name */}
          <div>
            <label className={labelCls}>Skill Name <span className="text-violet-500">*</span></label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="e.g. deploy-auto"
              className={inputCls}
            />
            <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-600">Use lowercase with hyphens (e.g. my-skill)</p>
          </div>

          {/* Version + Author */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Version <span className="text-violet-500">*</span></label>
              <input
                name="version"
                value={form.version}
                onChange={handleChange}
                required
                placeholder="1.0.0"
                className={inputCls + ' font-mono'}
              />
            </div>
            <div>
              <label className={labelCls}>Author <span className="text-violet-500">*</span></label>
              <input
                name="author"
                value={form.author}
                onChange={handleChange}
                required
                placeholder="Your name"
                className={inputCls}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Short Description</label>
            <input
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="One-line description of what this skill does"
              className={inputCls}
            />
          </div>

          {/* File upload */}
          <div>
            <label className={labelCls}>Skill File (.md or .zip) <span className="text-violet-500">*</span></label>
            <div
              className={`border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-all duration-200 ${
                dragOver
                  ? 'border-violet-400 bg-violet-50 dark:bg-violet-500/8 scale-[1.01]'
                  : file
                  ? 'border-emerald-400 dark:border-emerald-500/60 bg-emerald-50 dark:bg-emerald-500/8'
                  : 'border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-700 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-violet-50/30 dark:hover:bg-violet-500/5'
              }`}
              onClick={() => document.getElementById('file-input').click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input
                id="file-input"
                type="file"
                accept=".md,.zip"
                className="hidden"
                onChange={e => handleFile(e.target.files[0])}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2.5">
                  <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-500/15 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{file.name}</p>
                    <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70 mt-0.5">{(file.size / 1024).toFixed(1)} KB • Click to change</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-11 h-11 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-slate-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Drop your file here, or click to browse</p>
                  <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">
                    Supports <span className="font-mono text-violet-600 dark:text-violet-400">.md</span> and <span className="font-mono text-violet-600 dark:text-violet-400">.zip</span> files
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-500/8 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 dark:disabled:bg-violet-800 text-white font-semibold py-3.5 rounded-xl transition-all duration-150 disabled:cursor-not-allowed text-sm shadow-md shadow-violet-500/25 hover:shadow-violet-500/40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
                </svg>
                {updateName ? 'Upload Update' : 'Upload Skill'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
