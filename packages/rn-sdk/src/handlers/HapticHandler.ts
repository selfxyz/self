// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { BridgeDomain } from '../bridge/types';
import type { BridgeHandler } from '../bridge/types';
import { BridgeHandlerError } from '../bridge/types';

export interface HapticModule {
  trigger(type: string, options?: Record<string, unknown>): void;
}

function loadHaptics(): HapticModule | undefined {
  try {
    const mod = require('react-native-haptic-feedback');
    return mod.default ?? mod;
  } catch {
    return undefined;
  }
}

const ALLOWED_TYPES = new Set([
  'selection',
  'impactLight',
  'impactMedium',
  'impactHeavy',
  'notificationSuccess',
  'notificationWarning',
  'notificationError',
  'soft',
  'rigid',
]);

export class HapticHandler implements BridgeHandler {
  readonly domain: BridgeDomain = 'haptic';
  private readonly haptics: HapticModule | undefined;

  constructor(haptics?: HapticModule) {
    this.haptics = haptics ?? loadHaptics();
  }

  async handle(method: string, params: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'trigger': {
        if (!this.haptics) {
          // Haptics are non-critical; fail silently rather than throwing.
          return null;
        }
        const type = (params.type as string | undefined) ?? 'selection';
        if (!ALLOWED_TYPES.has(type)) {
          throw new BridgeHandlerError(
            'INVALID_PARAMS',
            `Unknown haptic type: ${type}`,
          );
        }
        try {
          this.haptics.trigger(type, {
            enableVibrateFallback: true,
            ignoreAndroidSystemSettings: false,
          });
        } catch {
          // Best-effort: never propagate haptic failures to the WebView.
        }
        return null;
      }
      default:
        throw new BridgeHandlerError(
          'METHOD_NOT_FOUND',
          `Unknown haptic method: ${method}`,
        );
    }
  }
}
