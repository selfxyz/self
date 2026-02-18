// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Browser-safe exports with explicit tree-shaking friendly imports.

// Types
export type {
  Adapters,
  AnalyticsAdapter,
  AuthAdapter,
  ClockAdapter,
  Config,
  CryptoAdapter,
  DocumentsAdapter,
  HttpAdapter,
  LogLevel,
  LoggerAdapter,
  MRZInfo,
  MRZValidation,
  NFCScanResult,
  NFCScannerAdapter,
  NavigationAdapter,
  NetworkAdapter,
  Progress,
  RouteName,
  SdkInitialConfig,
  SelfClient,
  StorageAdapter,
  TrackEventParams,
  Unsubscribe,
  VerificationRequest,
  WsAdapter,
  WsConn,
} from './types/public';

export type { BaseContext, NFCScanContext, ProofContext } from './proving/internal/logging';
export type { DG1, DG2, ParsedNFCResponse } from './nfc';
export type { PassportValidationCallbacks } from './validation/document';
export type { ProvingStateType, provingMachineCircuitType } from './proving/provingMachine';
export type { SDKEvent, SDKEventMap } from './types/events';
export type { SdkErrorCategory } from './errors';

export {
  InitError,
  LivenessError,
  MrzParseError,
  NfcParseError,
  SCANNER_ERROR_CODES,
  SdkError,
  notImplemented,
  sdkError,
} from './errors';

export { SdkEvents } from './types/events';

export { SelfClientContext, SelfClientProvider, useSelfClient } from './context';

export { advercase, dinot, dinotBold, plexMono } from './constants/fonts';

export {
  clearPassportData,
  getAllDocuments,
  hasAnyValidRegisteredDocument,
  loadSelectedDocument,
  markCurrentDocumentAsRegistered,
  reStorePassportDataWithRightCSCA,
  storePassportData,
} from './documents/utils';

export { createListenersMap, createSelfClient } from './client';

export { defaultConfig } from './config/defaults';

/** @deprecated Use createSelfClient().extractMRZInfo or import from './mrz' */
export { extractMRZInfo, extractNameFromMRZ, formatDateToYYMMDD } from './mrz';

export { generateMockDocument, signatureAlgorithmToStrictSignatureAlgorithm } from './mock/generator';

export { isPassportDataValid } from './validation/document';

export { mergeConfig } from './config/merge';

export { parseNFCResponse, scanNFC } from './nfc';

export { sanitizeErrorMessage } from './utils/utils';

export { webNFCScannerShim } from './adapters/web/shims';

// Browser-native adapter factories (no React Native dependencies)
export {
  createIndexedDBDocumentsAdapter,
  createWebCryptoAdapter,
  createWebAnalyticsAdapter,
  createNoOpHapticAdapter,
} from './adapters/browser';
export type { WebAnalyticsOptions } from './adapters/browser';
