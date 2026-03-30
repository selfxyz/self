// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PasswordGate } from '../../src/components/PasswordGate';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';

describe('PasswordGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it('renders children immediately when no preview password is configured', () => {
    vi.stubEnv('VITE_WEBVIEW_APP_PREVIEW_PASSWORD', '');

    render(
      <PasswordGate>
        <div>Unlocked content</div>
      </PasswordGate>,
    );

    expect(screen.getByText('Unlocked content')).toBeTruthy();
    expect(screen.queryByPlaceholderText('Password')).toBeNull();
  });

  it('unlocks after the correct password and persists the session', () => {
    vi.stubEnv('VITE_WEBVIEW_APP_PREVIEW_PASSWORD', 'secret-preview');

    render(
      <PasswordGate>
        <div>Unlocked content</div>
      </PasswordGate>,
    );

    expect(screen.queryByText('Unlocked content')).toBeNull();

    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'secret-preview' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enter/i }));

    expect(screen.getByText('Unlocked content')).toBeTruthy();
    expect(sessionStorage.getItem('self-preview-auth')).toBe('true');
  });

  it('renders children immediately when the session is already authenticated', () => {
    vi.stubEnv('VITE_WEBVIEW_APP_PREVIEW_PASSWORD', 'secret-preview');
    sessionStorage.setItem('self-preview-auth', 'true');

    render(
      <PasswordGate>
        <div>Unlocked content</div>
      </PasswordGate>,
    );

    expect(screen.getByText('Unlocked content')).toBeTruthy();
    expect(screen.queryByPlaceholderText('Password')).toBeNull();
  });
});
