// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

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
