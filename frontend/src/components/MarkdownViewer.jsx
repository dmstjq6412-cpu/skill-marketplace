import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MarkdownViewer({ content }) {
  if (!content) return (
    <p className="text-slate-400 dark:text-slate-600 italic text-sm">No description provided.</p>
  );
  return (
    <div className="prose prose-slate dark:prose-invert prose-sm sm:prose-base max-w-none
                    prose-headings:font-display prose-headings:tracking-tight
                    prose-a:text-violet-600 dark:prose-a:text-violet-400 prose-a:no-underline hover:prose-a:underline
                    prose-code:font-mono prose-code:text-violet-700 dark:prose-code:text-violet-300
                    prose-code:bg-violet-50 dark:prose-code:bg-violet-500/10
                    prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[0.85em]
                    prose-pre:bg-[#13141e] dark:prose-pre:bg-[#0e0f16] prose-pre:border prose-pre:border-slate-200 dark:prose-pre:border-slate-800
                    prose-pre:rounded-xl prose-pre:shadow-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
