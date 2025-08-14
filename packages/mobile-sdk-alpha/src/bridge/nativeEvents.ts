import type { Unsubscribe } from '../types/public';

export type EventHandler = (...args: any[]) => void;

export interface NativeEventBridge {
  addListener(moduleName: string, eventName: string, handler: EventHandler): Unsubscribe;
  removeListener(moduleName: string, eventName: string, handler: EventHandler): void;
}

export const addListener: NativeEventBridge['addListener'] = () => () => {};
export const removeListener: NativeEventBridge['removeListener'] = () => {};
