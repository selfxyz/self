// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it, vi } from 'vitest';

import { addListener, removeListener } from '../../src/bridge/nativeEvents';

describe('nativeEvents bridge (stub)', () => {
  it('returns unsubscribe function and allows removal', () => {
    const handler = () => {};
    const unsub = addListener('TestModule', 'test', handler);
    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
    expect(() => removeListener('TestModule', 'test', handler)).not.toThrow();
  });
});

describe('nativeEvents bridge (react-native)', () => {
  it('delegates to NativeEventEmitter', async () => {
    const removeSubMock = vi.fn();
    const addListenerMock = vi.fn(() => ({ remove: removeSubMock }));
    const removeListenerMock = vi.fn();

    vi.doMock('react-native', () => ({
      NativeModules: { TestModule: { addListener: vi.fn(), removeListeners: vi.fn() } },
      NativeEventEmitter: vi.fn(() => ({
        addListener: addListenerMock,
        removeListener: removeListenerMock,
      })),
    }));

    vi.resetModules();

    const rn = await import('../../src/bridge/nativeEvents.native');

    const handler = () => {};
    const unsub = rn.addListener('TestModule', 'event', handler);
    expect(addListenerMock).toHaveBeenCalledWith('event', handler);

    rn.removeListener('TestModule', 'event', handler);
    expect(removeListenerMock).toHaveBeenCalledWith('event', handler);

    unsub();
    expect(removeSubMock).toHaveBeenCalledTimes(1);
  });

  it('caches emitter per module', async () => {
    const addListenerMock = vi.fn(() => ({ remove: vi.fn() }));
    const NativeEventEmitterMock = vi.fn(() => ({
      addListener: addListenerMock,
      removeListener: vi.fn(),
    }));

    vi.doMock('react-native', () => ({
      NativeModules: { TestModule: { addListener: vi.fn(), removeListeners: vi.fn() } },
      NativeEventEmitter: NativeEventEmitterMock,
    }));

    vi.resetModules();

    const rn = await import('../../src/bridge/nativeEvents.native');

    const handler = () => {};
    const unsub1 = rn.addListener('TestModule', 'event', handler);
    const unsub2 = rn.addListener('TestModule', 'event', handler);
    expect(NativeEventEmitterMock).toHaveBeenCalledTimes(1);

    unsub1();
    unsub2();
  });
});
