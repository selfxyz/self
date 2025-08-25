// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { NativeEventSubscription } from 'react-native';
import { NativeEventEmitter, NativeModules } from 'react-native';

import type { NativeEventBridge } from './nativeEvents';

const emitters: Record<string, NativeEventEmitter> = {};

function getEmitter(moduleName: string): NativeEventEmitter {
  if (!emitters[moduleName]) {
    const mod = (NativeModules as Record<string, any>)[moduleName];
    const hasExpectedShape =
      !!mod && typeof (mod as any).addListener === 'function' && typeof (mod as any).removeListeners === 'function';
    if (!hasExpectedShape) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        // eslint-disable-next-line no-console
        console.warn(
          `[nativeEvents] Native module '${moduleName}' is missing or does not implement addListener/removeListeners; ` +
            'falling back to a shared emitter. Events may not fire on iOS.',
        );
      }
      emitters[moduleName] = new NativeEventEmitter();
    } else {
      emitters[moduleName] = new NativeEventEmitter(mod);
    }
  }
  return emitters[moduleName];
}

export const addListener: NativeEventBridge['addListener'] = (moduleName, eventName, handler) => {
  const emitter = getEmitter(moduleName);
  const sub: NativeEventSubscription = emitter.addListener(eventName, handler);
  return () => sub.remove();
};

export const removeListener: NativeEventBridge['removeListener'] = (moduleName, eventName, handler) => {
  const emitter = emitters[moduleName];
  if (emitter) {
    (emitter as any).removeListener?.(eventName, handler);
  }
};
