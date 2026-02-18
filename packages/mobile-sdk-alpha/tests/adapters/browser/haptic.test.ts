// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, it, expect } from 'vitest';

import { createNoOpHapticFeedback } from '../../../src/adapters/browser/haptic';

describe('createNoOpHapticFeedback', () => {
  it('should return a function', () => {
    const trigger = createNoOpHapticFeedback();
    expect(typeof trigger).toBe('function');
  });

  it('should not throw when called with any haptic type', () => {
    const trigger = createNoOpHapticFeedback();
    expect(() => trigger('selection')).not.toThrow();
    expect(() => trigger('impactLight')).not.toThrow();
    expect(() => trigger('impactMedium')).not.toThrow();
    expect(() => trigger('impactHeavy')).not.toThrow();
    expect(() => trigger('notificationSuccess')).not.toThrow();
    expect(() => trigger('notificationWarning')).not.toThrow();
    expect(() => trigger('notificationError')).not.toThrow();
    expect(() => trigger('custom', { pattern: [100, 200] })).not.toThrow();
  });
});
