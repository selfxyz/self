import type { Unsubscribe } from '../types/public';

export type EventHandler = (...args: unknown[]) => void;

export interface NativeEventBridge {
  addListener(moduleName: string, eventName: string, handler: EventHandler): Unsubscribe;
  removeListener(moduleName: string, eventName: string, handler: EventHandler): void;
}

export const addListener: NativeEventBridge['addListener'] = (moduleName, eventName, handler) => () =>
  removeListener(moduleName, eventName, handler);

export const removeListener: NativeEventBridge['removeListener'] = () => {};
