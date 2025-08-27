// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { Unsubscribe } from '../types/public';

export type EventHandler = (...args: unknown[]) => void;

export interface NativeEventBridge {
  addListener(moduleName: string, eventName: string, handler: EventHandler): Unsubscribe;
  removeListener(moduleName: string, eventName: string, handler: EventHandler): void;
}

export const addListener: NativeEventBridge['addListener'] = (moduleName, eventName, handler) => () =>
  removeListener(moduleName, eventName, handler);

export const removeListener: NativeEventBridge['removeListener'] = () => {};
