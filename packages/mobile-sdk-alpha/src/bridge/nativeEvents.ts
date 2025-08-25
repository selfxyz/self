// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import type { Unsubscribe } from '../types/public';

export type EventHandler = (...args: unknown[]) => void;

export interface NativeEventBridge {
  addListener(moduleName: string, eventName: string, handler: EventHandler): Unsubscribe;
  removeListener(moduleName: string, eventName: string, handler: EventHandler): void;
}

export const addListener: NativeEventBridge['addListener'] = (moduleName, eventName, handler) => () =>
  removeListener(moduleName, eventName, handler);

export const removeListener: NativeEventBridge['removeListener'] = () => {};
