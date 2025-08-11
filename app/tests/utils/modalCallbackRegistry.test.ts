// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import {
  getModalCallbacks,
  registerModalCallbacks,
  unregisterModalCallbacks,
} from '@/utils/modalCallbackRegistry';

describe('modalCallbackRegistry', () => {
  const registeredIds: number[] = [];

  afterEach(() => {
    registeredIds.forEach(id => unregisterModalCallbacks(id));
    registeredIds.length = 0;
  });

  it('should register and retrieve callbacks', () => {
    const callbacks = { onButtonPress: jest.fn(), onModalDismiss: jest.fn() };
    const id = registerModalCallbacks(callbacks);
    registeredIds.push(id);

    expect(getModalCallbacks(id)).toBe(callbacks);
  });

  it('should unregister callbacks', () => {
    const callbacks = { onButtonPress: jest.fn(), onModalDismiss: jest.fn() };
    const id = registerModalCallbacks(callbacks);
    unregisterModalCallbacks(id);

    expect(getModalCallbacks(id)).toBeUndefined();
  });

  it('should generate unique ids', () => {
    const id1 = registerModalCallbacks({
      onButtonPress: jest.fn(),
      onModalDismiss: jest.fn(),
    });
    const id2 = registerModalCallbacks({
      onButtonPress: jest.fn(),
      onModalDismiss: jest.fn(),
    });
    registeredIds.push(id1, id2);

    expect(id1).not.toBe(id2);
  });
});
