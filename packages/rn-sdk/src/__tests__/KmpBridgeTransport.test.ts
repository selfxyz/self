// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, it, expect, vi, beforeEach } from 'vitest';

interface FakeEmitter {
  listeners: Map<string, Array<(payload: unknown) => void>>;
  emit(event: string, payload: unknown): void;
  remove: ReturnType<typeof vi.fn>;
}

const fakeEmitter: FakeEmitter = {
  listeners: new Map(),
  emit(event, payload) {
    (this.listeners.get(event) ?? []).forEach(fn => fn(payload));
  },
  remove: vi.fn(),
};

vi.mock('react-native', () => {
  const routeMessage = vi.fn();
  return {
    NativeModules: {
      SelfBridge: { routeMessage },
    },
    NativeEventEmitter: class {
      addListener(event: string, fn: (payload: unknown) => void) {
        const arr = fakeEmitter.listeners.get(event) ?? [];
        arr.push(fn);
        fakeEmitter.listeners.set(event, arr);
        return { remove: fakeEmitter.remove };
      }
    },
  };
});

describe('KmpBridgeTransport', () => {
  beforeEach(() => {
    fakeEmitter.listeners.clear();
    fakeEmitter.remove.mockClear();
  });

  it('is available when the native module is registered', async () => {
    const { KmpBridgeTransport } = await import('../bridge/KmpBridgeTransport');
    const t = new KmpBridgeTransport({ inject: () => undefined });
    expect(t.isAvailable()).toBe(true);
  });

  it('forwards routeMessage payloads to the native module', async () => {
    const { KmpBridgeTransport } = await import('../bridge/KmpBridgeTransport');
    const { NativeModules } = await import('react-native');
    const t = new KmpBridgeTransport({ inject: () => undefined });
    t.dispatch('{"id":"req-1","domain":"secureStorage"}');
    expect((NativeModules as unknown as { SelfBridge: { routeMessage: ReturnType<typeof vi.fn> } }).SelfBridge.routeMessage)
      .toHaveBeenCalledWith('{"id":"req-1","domain":"secureStorage"}');
  });

  it('hands emitted JS injections to the inject callback', async () => {
    const { KmpBridgeTransport } = await import('../bridge/KmpBridgeTransport');
    const inject = vi.fn();
    new KmpBridgeTransport({ inject });
    fakeEmitter.emit('SelfBridge:injection', "window.SelfNativeBridge._handleResponse('{}');");
    expect(inject).toHaveBeenCalledWith("window.SelfNativeBridge._handleResponse('{}');");
  });

  it('dispose removes the event subscription', async () => {
    const { KmpBridgeTransport } = await import('../bridge/KmpBridgeTransport');
    const t = new KmpBridgeTransport({ inject: () => undefined });
    t.dispose();
    expect(fakeEmitter.remove).toHaveBeenCalled();
  });
});
