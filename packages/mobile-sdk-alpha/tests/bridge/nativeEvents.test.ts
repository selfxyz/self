import { describe, expect, it, vi } from 'vitest';

import { addListener, removeListener } from '../../src/bridge/nativeEvents';

describe('nativeEvents bridge (stub)', () => {
  it('returns unsubscribe function and allows removal', () => {
    const handler = () => {};
    const unsub = addListener('TestModule', 'test', handler);
    expect(typeof unsub).toBe('function');
    unsub();
    expect(() => removeListener('TestModule', 'test', handler)).not.toThrow();
  });
});

describe('nativeEvents bridge (react-native)', () => {
  it('delegates to NativeEventEmitter', async () => {
    const addListenerMock = vi.fn(() => ({ remove: vi.fn() }));
    const removeListenerMock = vi.fn();

    vi.doMock('react-native', () => ({
      NativeModules: { TestModule: {} },
      NativeEventEmitter: vi.fn(() => ({
        addListener: addListenerMock,
        removeListener: removeListenerMock,
      })),
    }));

    const rn = await import('../../src/bridge/nativeEvents.native');

    const handler = () => {};
    const unsub = rn.addListener('TestModule', 'event', handler);
    expect(addListenerMock).toHaveBeenCalledWith('event', handler);

    rn.removeListener('TestModule', 'event', handler);
    expect(removeListenerMock).toHaveBeenCalledWith('event', handler);

    unsub();
  });
});
