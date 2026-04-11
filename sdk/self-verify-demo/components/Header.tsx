'use client';

import { useEffect, useState } from 'react';

export function Header() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('sv-dark-mode');
    if (stored === 'true' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('sv-dark-mode', String(next));
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
      <div>
        <h1 className="text-xl font-bold">Self Verify</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Identity verification widget demo</p>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={toggleDark}
          className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle dark mode"
        >
          {dark ? 'Light' : 'Dark'}
        </button>
        <ResetButton />
      </div>
    </header>
  );
}

function ResetButton() {
  function resetAll() {
    localStorage.removeItem('sv-verified-humanity');
    localStorage.removeItem('sv-verified-age');
    localStorage.removeItem('sv-verified-kyc');
    window.location.reload();
  }

  return (
    <button
      onClick={resetAll}
      className="px-3 py-1.5 text-sm rounded-md border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
    >
      Reset All
    </button>
  );
}
