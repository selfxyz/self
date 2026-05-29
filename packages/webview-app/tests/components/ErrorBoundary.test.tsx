// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const dismissMock = vi.fn();

vi.mock('../../src/providers/BridgeProvider', () => ({
  useBridge: () => ({}),
}));

vi.mock('@selfxyz/webview-bridge/adapters', () => ({
  bridgeLifecycleAdapter: () => ({
    dismiss: dismissMock,
  }),
}));

// Import after mocks
const { ErrorBoundary } = await import('../../src/components/ErrorBoundary');

const ThrowingChild: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) throw new Error('test crash');
  return <div>healthy content</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(cleanup);

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('healthy content')).toBeDefined();
  });

  it('catches errors and shows fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeDefined();
    expect(screen.getByRole('button', { name: /try again/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /close/i })).toBeDefined();
  });

  it('resets error state when retry is clicked', () => {
    let shouldThrow = true;
    const Conditional: React.FC = () => {
      if (shouldThrow) throw new Error('test crash');
      return <div>recovered</div>;
    };

    render(
      <ErrorBoundary>
        <Conditional />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeDefined();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText('recovered')).toBeDefined();
  });

  it('calls dismiss on close', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(dismissMock).toHaveBeenCalledWith({ reason: 'user_cancel' });
  });
});
