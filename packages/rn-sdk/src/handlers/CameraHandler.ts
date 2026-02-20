// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { BridgeDomain } from '../bridge/types';
import type { BridgeHandler } from '../bridge/types';
import { BridgeHandlerError } from '../bridge/types';

export class CameraHandler implements BridgeHandler {
  readonly domain: BridgeDomain = 'camera';

  async handle(method: string, _params: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'isAvailable':
        return true;
      case 'scanMRZ':
        throw new BridgeHandlerError(
          'NOT_IMPLEMENTED',
          'MRZ scan not yet implemented',
        );
      default:
        throw new BridgeHandlerError('METHOD_NOT_FOUND', `Unknown camera method: ${method}`);
    }
  }
}
