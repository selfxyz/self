// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { jest } from '@jest/globals';

// Minimal actor stub used to observe send calls and emit state transitions

export const actorMock = {
  start: jest.fn(),
  stop: jest.fn(),
  send: jest.fn(),
  on: jest.fn((eventType: string, handler: (event: any) => void) => {
    (actorMock as any)._eventHandler = handler;
    return {
      unsubscribe: jest.fn(() => {
        // Properly clean up event handler to prevent memory leak
        (actorMock as any)._eventHandler = null;
      }),
    };
  }),
  subscribe: jest.fn((cb: (state: any) => void) => {
    (actorMock as any)._callback = cb;
    return {
      unsubscribe: jest.fn(() => {
        // Properly clean up callback to prevent memory leak
        (actorMock as any)._callback = null;
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
