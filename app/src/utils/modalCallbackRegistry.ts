// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export type ModalCallbacks = {
  onButtonPress: (() => Promise<void>) | (() => void);
  onModalDismiss: () => void;
};

let currentId = 0;
const callbackMap = new Map<number, ModalCallbacks>();

export function getModalCallbacks(id: number): ModalCallbacks | undefined {
  return callbackMap.get(id);
}

export function registerModalCallbacks(callbacks: ModalCallbacks): number {
  const id = ++currentId;
  callbackMap.set(id, callbacks);
  return id;
}

export function unregisterModalCallbacks(id: number): void {
  callbackMap.delete(id);
}
