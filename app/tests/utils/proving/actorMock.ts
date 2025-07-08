// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { jest } from '@jest/globals';

// Minimal actor stub used to observe send calls and emit state transitions

export const actorMock = {
  start: jest.fn(),
  stop: jest.fn(),
  send: jest.fn(),
  subscribe: jest.fn((cb: (state: any) => void) => {
    (actorMock as any)._callback = cb;
    return { unsubscribe: jest.fn() };
  }),
};

export function emitState(stateValue: string) {
  const cb = (actorMock as any)._callback;
  if (cb) {
    cb({ value: stateValue, matches: (v: string) => v === stateValue });
  }
}
