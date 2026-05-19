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
import { AnalyticsHandler, type AnalyticsSink } from './AnalyticsHandler';
import { HapticHandler } from './HapticHandler';
import { NavigationHandler, type NavigationCallbacks } from './NavigationHandler';
import { DocumentsHandler, type DocumentsStore } from './DocumentsHandler';
import { CryptoHandler, type SelfCryptoModule } from './CryptoHandler';

export interface HandlersConfig {
  request: VerificationRequest;
  onSuccess: (result: VerificationResult) => void;
  onFailure: (error: SelfSdkError) => void;
  onCancelled: () => void;
  debug: boolean;
  router: MessageRouter;
  analytics?: AnalyticsSink;
  navigation?: NavigationCallbacks;
  documents?: DocumentsStore;
  crypto?: SelfCryptoModule;
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
    new AnalyticsHandler(config.analytics),
    new HapticHandler(),
    new NavigationHandler(config.navigation),
    new DocumentsHandler(config.documents),
    new CryptoHandler(config.crypto),
  ];
}

export { AnalyticsHandler } from './AnalyticsHandler';
export type { AnalyticsSink } from './AnalyticsHandler';
export { HapticHandler } from './HapticHandler';
export { NavigationHandler } from './NavigationHandler';
export type { NavigationCallbacks } from './NavigationHandler';
export { DocumentsHandler } from './DocumentsHandler';
export type { DocumentsStore } from './DocumentsHandler';
export { CryptoHandler } from './CryptoHandler';
export type { SelfCryptoModule } from './CryptoHandler';
