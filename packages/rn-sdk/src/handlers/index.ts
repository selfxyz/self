// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { BridgeHandler } from '../bridge/types';
import type { MessageRouter } from '../bridge/MessageRouter';
import type { VerificationRequest, VerificationResult, SelfSdkError } from '../SelfVerification';
import { LifecycleHandler } from './LifecycleHandler';
import { BiometricHandler } from './BiometricHandler';
import { KeychainHandler } from './KeychainHandler';
import { NfcHandler } from './NfcHandler';
import { CameraHandler } from './CameraHandler';

export interface HandlersConfig {
  request: VerificationRequest;
  onSuccess: (result: VerificationResult) => void;
  onFailure: (error: SelfSdkError) => void;
  onCancelled: () => void;
  debug: boolean;
  router: MessageRouter;
}

export function createHandlers(config: HandlersConfig): BridgeHandler[] {
  return [
    new LifecycleHandler({
      request: config.request,
      onSuccess: config.onSuccess,
      onFailure: config.onFailure,
      onCancelled: config.onCancelled,
      debug: config.debug,
    }),
    new BiometricHandler(),
    new KeychainHandler(),
    new NfcHandler(config.router),
    new CameraHandler(),
  ];
}
