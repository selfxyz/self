'use client';

import { useState } from 'react';
import type { Snippet } from '@/lib/snippets';

interface CodeSnippetProps {
  snippets: Snippet[];
}

export function CodeSnippet({ snippets }: CodeSnippetProps) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(snippets[active].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 py-1.5">
        <div className="flex gap-1">
          {snippets.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setActive(i)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                i === active
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button onClick={copy} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 text-xs leading-relaxed overflow-x-auto bg-gray-900 text-gray-100">
        <code>{snippets[active].code}</code>
      </pre>
    </div>
  );
}
