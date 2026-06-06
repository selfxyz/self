// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SupportReference } from '../../src/components/SupportReference';

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('@selfxyz/euclid', () => ({ colors: { slate700: '#334155' } }));
vi.mock('../../src/utils/insets', () => ({ WEB_SAFE_AREA: { insets: { top: 0, bottom: 16 } } }));

const useReferenceId = vi.fn<() => string | undefined>();
vi.mock('../../src/providers/OperatingModeProvider', () => ({
  useReferenceId: () => useReferenceId(),
}));

describe('SupportReference', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  it('renders nothing when no reference id is available', () => {
    useReferenceId.mockReturnValue(undefined);
    render(<SupportReference />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders the reference when an id is present', () => {
    useReferenceId.mockReturnValue('corr-1');
    render(<SupportReference />);
    expect(screen.getByRole('button').textContent).toBe('Reference: corr-1');
  });

  it('appears on re-render once the id resolves (read during render, not snapshotted)', () => {
    useReferenceId.mockReturnValue(undefined);
    const { rerender } = render(<SupportReference />);
    expect(screen.queryByRole('button')).toBeNull();

    useReferenceId.mockReturnValue('corr-late');
    rerender(<SupportReference />);
    expect(screen.getByRole('button').textContent).toBe('Reference: corr-late');
  });

  it('copies the id and shows a confirmation on click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    useReferenceId.mockReturnValue('corr-copy');

    render(<SupportReference />);
    fireEvent.click(screen.getByRole('button'));

    expect(writeText).toHaveBeenCalledWith('corr-copy');
    await waitFor(() => expect(screen.getByRole('button').textContent).toBe('Copied'));
    vi.unstubAllGlobals();
  });

  it('clears the confirmation timer on unmount', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    useReferenceId.mockReturnValue('corr-copy');

    const { unmount } = render(<SupportReference />);
    fireEvent.click(screen.getByRole('button'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByRole('button').textContent).toBe('Copied');

    expect(() => {
      unmount();
      vi.runOnlyPendingTimers();
    }).not.toThrow();

    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});
