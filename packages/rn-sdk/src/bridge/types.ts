// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export type {
  BridgeRequest,
  BridgeResponse,
  BridgeEvent,
  BridgeDomain,
  BridgeError,
} from '@selfxyz/webview-bridge';

import type { BridgeDomain } from '@selfxyz/webview-bridge';

export interface BridgeHandler {
  domain: BridgeDomain;
  handle(method: string, params: Record<string, unknown>): Promise<unknown>;
}

export class BridgeHandlerError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'BridgeHandlerError';
  }
}
