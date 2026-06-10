// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OperatingModeProvider, useOperatingMode } from '../../src/providers/OperatingModeProvider';

import { cleanup, render, screen, waitFor } from '@testing-library/react';

const request = vi.fn();

vi.mock('../../src/providers/BridgeProvider', () => ({
  useBridge: () => ({ request }),
}));

const Probe: React.FC = () => {
  const { referenceId, isReady } = useOperatingMode();
  return <div data-testid="probe">{isReady ? (referenceId ?? 'none') : 'pending'}</div>;
};

function setUrl(search: string): void {
  window.history.replaceState({}, '', `/${search}`);
}

describe('OperatingModeProvider referenceId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUrl('');
  });
  afterEach(cleanup);

  it('exposes referenceId from the host getConfig response', async () => {
    request.mockResolvedValue({ mode: 'self-app', referenceId: 'corr-config' });
    render(
      <OperatingModeProvider>
        <Probe />
      </OperatingModeProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('corr-config'));
  });

  it('falls back to the URL param when getConfig omits it', async () => {
    setUrl('?referenceId=corr-url');
    request.mockResolvedValue({ mode: 'self-app' });
    render(
      <OperatingModeProvider>
        <Probe />
      </OperatingModeProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('corr-url'));
  });

  it('falls back to the URL param when getConfig rejects (browser-host)', async () => {
    setUrl('?referenceId=corr-browser');
    request.mockRejectedValue(new Error('no transport'));
    render(
      <OperatingModeProvider>
        <Probe />
      </OperatingModeProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('corr-browser'));
  });

  it('is undefined when neither config nor URL provides it', async () => {
    request.mockResolvedValue({ mode: 'self-app' });
    render(
      <OperatingModeProvider>
        <Probe />
      </OperatingModeProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('none'));
  });
});
