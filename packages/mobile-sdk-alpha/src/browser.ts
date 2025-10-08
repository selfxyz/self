// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Browser-safe exports with explicit tree-shaking friendly imports

// Types
export type {
  Adapters,
  ClockAdapter,
  Config,
  CryptoAdapter,
  HttpAdapter,
  LogLevel,
  LoggerAdapter,
  MRZInfo,
  MRZValidation,
  NFCScanResult,
  NFCScannerAdapter,
  NetworkAdapter,
  Progress,
  SelfClient,
  StorageAdapter,
  Unsubscribe,
  WsAdapter,
  WsConn,
} from './types/public';

export type { DG1, DG2, ParsedNFCResponse } from './nfc';
export type { MRZScanOptions } from './mrz';
export type { PassportValidationCallbacks } from './validation/document';
export type { SDKEvent, SDKEventMap } from './types/events';

export type { SdkErrorCategory } from './errors';
export { type ProvingStateType } from './proving/provingMachine';

export { SCANNER_ERROR_CODES, notImplemented, sdkError } from './errors';
export { SdkEvents } from './types/events';

export { SelfClientContext, SelfClientProvider, useSelfClient } from './context';

export {
  clearPassportData,
  getAllDocuments,
  hasAnyValidRegisteredDocument,
  loadSelectedDocument,
  markCurrentDocumentAsRegistered,
  reStorePassportDataWithRightCSCA,
} from './documents/utils';

export { createListenersMap, createSelfClient } from './client';

export { defaultConfig } from './config/defaults';

/** @deprecated Use createSelfClient().extractMRZInfo or import from './mrz' */
export { extractMRZInfo, extractNameFromMRZ, formatDateToYYMMDD } from './mrz';

export { generateMockDocument, signatureAlgorithmToStrictSignatureAlgorithm } from './mock/generator';
// Core functions
export { isPassportDataValid } from './validation/document';

export { mergeConfig } from './config/merge';

export { parseNFCResponse, scanNFC } from './nfc';

export { reactNativeScannerAdapter } from './adapters/react-native/nfc-scanner';

export { useCountries } from './documents/useCountries';
export { webNFCScannerShim } from './adapters/web/shims';
