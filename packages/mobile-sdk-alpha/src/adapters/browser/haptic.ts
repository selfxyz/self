// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { HapticType, HapticOptions } from '../../haptic/shared';

/**
 * No-op haptic feedback for browser contexts where native haptics
 * and the Vibration API are unavailable (e.g., WebView, desktop browsers).
 *
 * Matches the `triggerFeedback` signature from `haptic/trigger.ts`.
 */
export function createNoOpHapticFeedback(): (type: HapticType | 'custom', options?: HapticOptions) => void {
  return (_type: HapticType | 'custom', _options?: HapticOptions): void => {
    // Intentionally empty — haptic feedback is unavailable in this context.
  };
}
