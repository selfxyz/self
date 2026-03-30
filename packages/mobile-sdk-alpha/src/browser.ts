// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Browser-safe exports with explicit tree-shaking friendly imports.

import type { IDDocument } from './types/public';

// Types
export type {
  Adapters,
  AnalyticsAdapter,
  AuthAdapter,
  ClockAdapter,
  Config,
  CryptoAdapter,
  DocumentCatalog,
  DocumentsAdapter,
  HttpAdapter,
  IDDocument,
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
export type { DocumentMetadata } from '@selfxyz/common';
/** Persisted KYC document format (subset of IDDocument union with documentCategory: 'kyc'). */
export type KycData = Extract<IDDocument, { documentCategory: 'kyc' }>;
export type { PassportValidationCallbacks } from './validation/document';
export type { ProvingState, ProvingStateType, provingMachineCircuitType } from './proving/provingMachine';
export type { SDKEvent, SDKEventMap } from './types/events';
export type { SdkErrorCategory } from './errors';
export type { WebAnalyticsOptions } from './adapters/browser';

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

export { calculateContentHash } from '@selfxyz/common';

// Browser-native adapter factories (no React Native dependencies)
export {
  clearPassportData,
  getAllDocuments,
  hasAnyValidRegisteredDocument,
  loadSelectedDocument,
  markCurrentDocumentAsRegistered,
  reStorePassportDataWithRightCSCA,
  storeDocumentWithDeduplication,
  storePassportData,
} from './documents/utils';
export {
  createIndexedDBDocumentsAdapter,
  createNoOpHapticAdapter,
  createWebAnalyticsAdapter,
  createWebCryptoAdapter,
  createWebNetworkAdapter,
} from './adapters/browser';

export { createListenersMap, createSelfClient } from './client';

/** @deprecated Use createSelfClient().extractMRZInfo or import from './mrz' */
export { defaultConfig } from './config/defaults';

export { deserializeApplicantInfo } from '@selfxyz/common';

export { extractMRZInfo, extractNameFromMRZ, formatDateToYYMMDD } from './mrz';

export { generateMockDocument, signatureAlgorithmToStrictSignatureAlgorithm } from './mock/generator';

export { getPostVerificationRoute, useProvingStore } from './proving/provingMachine';

export { isPassportDataValid } from './validation/document';

export { mergeConfig } from './config/merge';

export { parseNFCResponse, scanNFC } from './nfc';

export { sanitizeErrorMessage } from './utils/utils';
export { webNFCScannerShim } from './adapters/web/shims';
