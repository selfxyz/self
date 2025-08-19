import type { Unsubscribe } from '../types/public';

/**
 * Generic function signature for handlers of native events.
 */
export type EventHandler = (...args: unknown[]) => void;

/**
 * Minimal interface for bridging native platform event emitters.
 * Implementations may wrap React Native, Capacitor, or other layers.
 */
export interface NativeEventBridge {
  /**
   * Subscribe to a named event on a given native module.
   *
   * @param moduleName - Name of the native module exposing events.
   * @param eventName - Event identifier within the module.
   * @param handler - Callback invoked when the event fires.
   * @returns Function that unsubscribes the listener.
   */
  addListener(moduleName: string, eventName: string, handler: EventHandler): Unsubscribe;
  /**
   * Remove a previously registered event handler.
   */
  removeListener(moduleName: string, eventName: string, handler: EventHandler): void;
}

/**
 * Default no-op bridge for non-native environments.
 */
export const addListener: NativeEventBridge['addListener'] = (moduleName, eventName, handler) => () =>
  removeListener(moduleName, eventName, handler);

/**
 * Placeholder removal function used in browser builds.
 */
export const removeListener: NativeEventBridge['removeListener'] = () => {};
