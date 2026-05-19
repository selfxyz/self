// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { BridgeDomain } from '../bridge/types';
import type { BridgeHandler } from '../bridge/types';
import { BridgeHandlerError } from '../bridge/types';

export interface NavigationCallbacks {
  onGoBack?: () => boolean | void;
  onGoTo?: (routeName: string, params?: Record<string, unknown>) => boolean | void;
}

export class NavigationHandler implements BridgeHandler {
  readonly domain: BridgeDomain = 'navigation';
  private readonly callbacks: NavigationCallbacks;

  constructor(callbacks?: NavigationCallbacks) {
    this.callbacks = callbacks ?? {};
  }

  async handle(method: string, params: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'goBack': {
        const handled = this.callbacks.onGoBack?.();
        return { handled: handled === true };
      }
      case 'goTo': {
        const routeName = params.routeName as string | undefined;
        if (!routeName) {
          throw new BridgeHandlerError('MISSING_ROUTE', 'routeName parameter required');
        }
        const routeParams = params.params as Record<string, unknown> | undefined;
        const handled = this.callbacks.onGoTo?.(routeName, routeParams);
        return { handled: handled === true };
      }
      default:
        throw new BridgeHandlerError(
          'METHOD_NOT_FOUND',
          `Unknown navigation method: ${method}`,
        );
    }
  }
}
