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
export type { OnboardingTagSnapshot } from './observability/onboardingContext';
export type { PassportValidationCallbacks } from './validation/document';
export type { PerkId, PerkRecord } from './data/perks';
export type { ProvingState, ProvingStateType, provingMachineCircuitType } from './proving/provingMachine';

export type { RecoveryValidationResult } from './proving/recoveryValidation';
export type { SDKEvent, SDKEventMap } from './types/events';

export type { SdkErrorCategory } from './errors';
// Re-export common types needed for SelfApp context construction
export type { SelfApp, SelfAppDisclosureConfig } from '@selfxyz/common';

export type { SelfAppState } from './stores/selfAppStore';
export type { WebAnalyticsOptions } from './adapters/browser';
export {
  COHORT_TAG_KEYS,
  REDACTED,
  SENSITIVE_KEY_PATTERN,
  redactSensitiveFields,
  sanitizeTagValue,
  tagsFromAnalyticsEvent,
} from './observability/onboardingContext';
export {
  GOOGLE_USAT_FAUCET_APP_NAME,
  GOOGLE_USAT_FAUCET_ENDPOINT,
  GOOGLE_USAT_FAUCET_SCOPE,
} from './constants/googleUsat';
export { GOOGLE_USAT_FAUCET_POLICY } from './constants/restrictedApps';
export type { DocumentAttributes } from './documents/validation';
export { checkDocumentExpiration, getDocumentAttributes } from './documents/validation';
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
export { PERKS as SHARED_PERKS, getPerkRecordsForIdType } from './data/perks';
export { SdkEvents } from './types/events';
export { SelfClientContext, SelfClientProvider, useSelfClient } from './context';
export { advercase, dinot, dinotBold, plexMono } from './constants/fonts';
// Browser-native adapter factories (no React Native dependencies)
export {
  clearPassportData,
  getAllDocuments,
  hasAnyValidRegisteredDocument,
  loadSelectedDocument,
  markCurrentDocumentAsRegistered,
  reStorePassportDataWithRightCSCA,
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

export { defaultConfig } from './config/defaults';
/** @deprecated Use createSelfClient().extractMRZInfo or import from './mrz' */
export { extractMRZInfo, extractNameFromMRZ, formatDateToYYMMDD } from './mrz';

export { finalizeRecoveredDocumentRegistration, validateRecoverySecretForDocument } from './proving/recoveryValidation';
export { generateMockDocument, signatureAlgorithmToStrictSignatureAlgorithm } from './mock/generator';
export { getPostVerificationRoute, useProvingStore } from './proving/provingMachine';
export { hasEligibleAlternativeDocumentForPolicy, isDocumentEligibleForPolicy } from './utils/restrictedApps';
export { isGoogleUsatProofRequest } from './utils/googleUsat';
export { isPassportDataValid } from './validation/document';
export { mergeConfig } from './config/merge';
export { normalizeNfcPassport, parseNFCResponse, scanNFC } from './nfc';
export { sanitizeErrorMessage } from './utils/utils';
export { webNFCScannerShim } from './adapters/web/shims';
