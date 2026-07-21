// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { Socket } from 'socket.io-client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useSelfAppStore } from './selfAppStore';

function makeSocket() {
  return { emit: vi.fn(), disconnect: vi.fn() } as unknown as Socket & {
    emit: ReturnType<typeof vi.fn>;
  };
}

afterEach(() => {
  useSelfAppStore.setState({ socket: null, sessionId: null, selfApp: null });
  vi.restoreAllMocks();
});

describe('selfAppStore.startAppListener', () => {
  it('registers the session without a socket when relay is null (embedded mode)', () => {
    useSelfAppStore.getState().startAppListener('session-1', null);

    const state = useSelfAppStore.getState();
    expect(state.sessionId).toBe('session-1');
    expect(state.socket).toBeNull();
  });
});

describe('selfAppStore.handleProofResult', () => {
  it('emits proof_verified over the relayer socket on success', () => {
    const socket = makeSocket();
    useSelfAppStore.setState({ socket, sessionId: 'session-1' });

    useSelfAppStore.getState().handleProofResult(true);

    expect(socket.emit).toHaveBeenCalledWith('proof_verified', {
      session_id: 'session-1',
    });
  });

  it('emits proof_generation_failed with error details on failure', () => {
    const socket = makeSocket();
    useSelfAppStore.setState({ socket, sessionId: 'session-1' });

    useSelfAppStore.getState().handleProofResult(false, 'timeout', 'took too long');

    expect(socket.emit).toHaveBeenCalledWith('proof_generation_failed', {
      session_id: 'session-1',
      error_code: 'timeout',
      reason: 'took too long',
    });
  });

  it('is a silent no-op in embedded mode (session but no socket)', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    useSelfAppStore.setState({ socket: null, sessionId: 'session-1' });

    useSelfAppStore.getState().handleProofResult(true);

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('logs an error when neither socket nor session exist', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    useSelfAppStore.setState({ socket: null, sessionId: null });

    useSelfAppStore.getState().handleProofResult(true);

    expect(errorSpy).toHaveBeenCalled();
  });
});
