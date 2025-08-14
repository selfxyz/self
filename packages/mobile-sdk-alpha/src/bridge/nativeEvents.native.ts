import type { NativeEventSubscription } from 'react-native';
import { NativeEventEmitter, NativeModules } from 'react-native';

import type { NativeEventBridge } from './nativeEvents';

const emitters: Record<string, NativeEventEmitter> = {};

function getEmitter(moduleName: string): NativeEventEmitter {
  if (!emitters[moduleName]) {
    const mod = (NativeModules as Record<string, any>)[moduleName];
    emitters[moduleName] = new NativeEventEmitter(mod);
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
