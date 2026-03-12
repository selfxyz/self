// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { vi } from 'vitest';

export type MockWindowWithListeners = Window & {
  __dispatchMessage(event: MessageEvent): void;
};

export function createMockWindow({
  parent,
  opener = null,
}: {
  parent: Window;
  opener?: Window | null;
}): MockWindowWithListeners {
  let messageListener: ((event: MessageEvent) => void) | undefined;

  return {
    parent,
    opener,
    addEventListener: vi.fn(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'message' && typeof listener === 'function') {
          messageListener = listener as (event: MessageEvent) => void;
        }
      },
    ),
    removeEventListener: vi.fn(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'message' && listener === messageListener) {
          messageListener = undefined;
        }
      },
    ),
    __dispatchMessage(event: MessageEvent) {
      messageListener?.(event);
    },
  } as unknown as MockWindowWithListeners;
}
