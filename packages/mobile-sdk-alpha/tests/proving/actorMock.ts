// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Minimal actor stub used to observe send calls and emit state transitions

export const actorMock = {
  start: vitest.fn(),
  stop: vitest.fn(),
  send: vitest.fn(),
  subscribe: vitest.fn((cb: (state: any) => void) => {
    (actorMock as any)._callback = cb;
    return { unsubscribe: vitest.fn() };
  }),
};

export function emitState(stateValue: string) {
  const cb = (actorMock as any)._callback;
  if (cb) {
    cb({ value: stateValue, matches: (v: string) => v === stateValue });
  }
}
