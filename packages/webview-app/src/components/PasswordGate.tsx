// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useState } from 'react';

const STORAGE_KEY = 'self-preview-auth';

export const PasswordGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const password = import.meta.env.VITE_WEBVIEW_APP_PREVIEW_PASSWORD;

  const [authenticated, setAuthenticated] = useState(() => !password || sessionStorage.getItem(STORAGE_KEY) === 'true');
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (value === password) {
        sessionStorage.setItem(STORAGE_KEY, 'true');
        setAuthenticated(true);
      } else {
        setError(true);
      }
    },
    [value, password],
  );

  if (authenticated) return <>{children}</>;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        backgroundColor: '#f8fafc',
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          width: 280,
        }}
      >
        <input
          type="password"
          placeholder="Password"
          value={value}
          onChange={e => {
            setValue(e.target.value);
            setError(false);
          }}
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            border: error ? '1px solid #ef4444' : '1px solid #d1d5db',
            fontSize: 14,
            outline: 'none',
          }}
          autoFocus
        />
        <button
          type="submit"
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: '#111827',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Enter
        </button>
      </form>
    </div>
  );
};
