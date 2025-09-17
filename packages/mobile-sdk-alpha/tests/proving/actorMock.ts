// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Minimal actor stub used to observe send calls and emit state transitions

import { vi } from 'vitest';

export const actorMock = {
  start: vi.fn(),
  stop: vi.fn(),
  send: vi.fn(),
  subscribe: vi.fn((cb: (state: any) => void) => {
    (actorMock as any)._callback = cb;
    return {
      unsubscribe: vi.fn(() => {
        // Properly clean up callback to prevent memory leak
        (actorMock as any)._callback = null;
      }),
    };
  }),
  on: vi.fn((eventType: string, handler: (event: any) => void) => {
    (actorMock as any)._eventHandler = handler;
    return {
      unsubscribe: vi.fn(() => {
        // Properly clean up event handler to prevent memory leak
        (actorMock as any)._eventHandler = null;
      }),
    };
  }),
};

export function emitState(stateValue: string) {
  const cb = (actorMock as any)._callback;
  if (cb) {
    cb({ value: stateValue, matches: (v: string) => v === stateValue });
  }
}
