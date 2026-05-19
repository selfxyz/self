// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export {
  SelfVerification,
  type SelfVerificationProps,
  type VerificationRequest,
  type VerificationResult,
  type SelfSdkError,
} from './SelfVerification';

export { MessageRouter } from './bridge/MessageRouter';

export { type BridgeHandler, BridgeHandlerError } from './bridge/types';

export {
  AnalyticsHandler,
  type AnalyticsSink,
  HapticHandler,
  NavigationHandler,
  type NavigationCallbacks,
  DocumentsHandler,
  type DocumentsStore,
  CryptoHandler,
  type SelfCryptoModule,
  createHandlers,
  type HandlersConfig,
} from './handlers';
