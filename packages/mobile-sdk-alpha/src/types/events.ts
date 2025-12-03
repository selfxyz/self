// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { DocumentCategory } from '@selfxyz/common';

import type { NFCScanContext, ProofContext } from '../proving/internal/logging';
import type { LogLevel, Progress } from './base';

/**
 * SDK lifecycle events emitted by {@link SelfClient}. Events are dispatched
 * synchronously to listeners in registration order. If a listener throws an
 * error, the SDK logs a sanitized/redacted summary (never PII or secrets)
 * and continues dispatching to remaining listeners.
 *
 * **Security:** Host apps should likewise sanitize errors from their listeners
 * before logging. Redact sensitive fields (MRZ, names, DOB, passport numbers,
 * keys, tokens) and retain only non-sensitive diagnostic details.
 */
export enum SdkEvents {
  /**
   * Emitted when an error occurs during SDK operations, including timeouts.
   *
   * **Required:** Handle this event to provide error feedback to users.
   * **Recommended:** Log errors for debugging and show appropriate user-friendly error messages.
   */
  ERROR = 'ERROR',

  /**
   * Emitted to provide progress updates during long-running operations.
   *
   * **Recommended:** Use this to show progress indicators or loading states to improve user experience.
   */
  PROGRESS = 'PROGRESS',

  /**
   * Emitted when Aadhaar QR code upload is successful.
   *
   * **Required:** Navigate to the AadhaarUploadSuccess screen to inform users of the successful upload.
   */
  PROVING_AADHAAR_UPLOAD_SUCCESS = 'PROVING_AADHAAR_UPLOAD_SUCCESS',

  /**
   * Emitted when Aadhaar QR code upload fails.
   *
   * **Required:** Navigate to the AadhaarUploadError screen to inform users of the failure and provide troubleshooting steps.
   */
  PROVING_AADHAAR_UPLOAD_FAILURE = 'PROVING_AADHAAR_UPLOAD_FAILURE',

  /**
   * Emitted when no passport data is found on the device during initialization.
   *
   * **Required:** Navigate users to a document scanning/setup screen to capture their passport data.
   * **Recommended:** Provide clear instructions on how to scan and register their document properly.
   */
  PROVING_PASSPORT_DATA_NOT_FOUND = 'PROVING_PASSPORT_DATA_NOT_FOUND',

  /**
   * Emitted when identity verification completes successfully.
   *
   * **Required:** Show success confirmation to the user that their identity was verified.
   * **Recommended:** Navigate to your app's main screen or success page after a brief delay (3 seconds)
   * to allow users to see the success state.
   */
  PROVING_ACCOUNT_VERIFIED_SUCCESS = 'PROVING_ACCOUNT_VERIFIED_SUCCESS',

  /**
   * Emitted when document registration fails or encounters an error.
   *
   * **Required:** Handle navigation based on the `hasValidDocument` parameter:
   * - If `hasValidDocument` is `true`: Navigate to your app's home screen (user has other valid documents registered)
   * - If `hasValidDocument` is `false`: Navigate to launch/onboarding screen (user needs to register documents)
   * **Recommended:** Show appropriate error messages and implement a brief delay (3 seconds) before navigation.
   */
  PROVING_REGISTER_ERROR_OR_FAILURE = 'PROVING_REGISTER_ERROR_OR_FAILURE',

  /**
   * Emitted when a passport from an unsupported country or document type is detected during validation.
   *
   * **Required:** Inform users that their document is not currently supported.
   * **Recommended:** Navigate to an unsupported document / ComingSoon screen showing the detected country code and
   * document category, and provide guidance on alternative verification methods if available.
   */
  PROVING_PASSPORT_NOT_SUPPORTED = 'PROVING_PASSPORT_NOT_SUPPORTED',

  /**
   * Emitted when account recovery is required because the passport was registered with different credentials.
   * This happens when a document's nullifier is found on-chain but not registered with the current user's secret.
   *
   * **Required:** Navigate users to an account recovery screen with recovery options or instructions if the have originally registered with a differnt self app.
   * **Recommended:** Explain that their passport was previously registered with different account credentials
   * and guide them through the recovery process to regain access.
   */
  PROVING_ACCOUNT_RECOVERY_REQUIRED = 'PROVING_ACCOUNT_RECOVERY_REQUIRED',

  /**
   * Emitted when a user selects a country in the document flow.
   *
   * **Required:** Navigate the user to the screen where they will select the document type.
   * The event includes the selected country code and available document types.
   */
  DOCUMENT_COUNTRY_SELECTED = 'DOCUMENT_COUNTRY_SELECTED',

  /**
   * Emitted when a user selects a document type for verification.
   *
   * **Required:** Navigate the user to the document type screen that was selected.
   * The event includes the selected document type, country code, and document name.
   */
  DOCUMENT_TYPE_SELECTED = 'DOCUMENT_TYPE_SELECTED',

  /**
   * Emitted when the proving generation process begins.
   *
   * **Recommended:** Use this to handle notification token registration and other setup tasks
   * that need to occur when proof generation starts.
   */
  PROVING_BEGIN_GENERATION = 'PROVING_BEGIN_GENERATION',
  /**
   * Emitted for various proof-related events during the proving process.
   *
   * **Recommended:** Log these events for monitoring and debugging purposes.
   * Use the `context` and `details` to gain insights into the proving process and
   * identify any issues that may arise.
   */
  PROOF_EVENT = 'PROOF_EVENT',
  /**
   * Emitted for NFC-related events during document scanning.
   *
   * **Recommended:** Log these events for monitoring and debugging purposes.
   * Use the `context` and `details` to gain insights into the NFC scanning process and
   * identify any issues that may arise.
   */
  NFC_EVENT = 'NFC_EVENT',

  /**
   * Emitted when document camera scan is successful and ready for NFC scanning.
   *
   * **Required:** Navigate to the DocumentNFCScan screen to continue the verification process.
   * **Recommended:** This event is triggered after successful MRZ data extraction and validation.
   */
  DOCUMENT_MRZ_READ_SUCCESS = 'DOCUMENT_MRZ_READ_SUCCESS',

  /**
   * Emitted when document camera scan fails due to invalid MRZ data format.
   *
   * **Required:** Navigate to the DocumentCameraTrouble screen to show troubleshooting tips.
   * **Recommended:** This event is triggered when MRZ data validation fails (invalid format, missing fields, etc.).
   */
  DOCUMENT_MRZ_READ_FAILURE = 'DOCUMENT_MRZ_READ_FAILURE',

  /**
   * Emitted when document NFC scan is successful and ready for confirmation.
   *
   * **Required:** Navigate to the ConfirmIdentification screen to continue the verification process.
   * **Recommended:** This event is triggered after successful NFC data extraction and validation.
   */
  DOCUMENT_NFC_SCAN_SUCCESS = 'DOCUMENT_NFC_SCAN_SUCCESS',

  /**
   * Emitted when the user confirms ownership of the document being registered.
   *
   * **Required:** Proceed with the document proving process after receiving this event.
   * **Recommended:** Use this time to ensure permissions for notifications are granted,
   *
   */
  DOCUMENT_OWNERSHIP_CONFIRMED = 'DOCUMENT_OWNERSHIP_CONFIRMED',
}

/**
 * Maps event names to their payload types. Enables type-safe event handlers
 * and provides structured data like NFC scan diagnostics or proof errors.
 * Events with undefined payloads carry no additional data.
 */
export interface SDKEventMap {
  [SdkEvents.PROVING_PASSPORT_DATA_NOT_FOUND]: undefined;
  [SdkEvents.PROVING_ACCOUNT_VERIFIED_SUCCESS]: undefined;
  [SdkEvents.PROVING_REGISTER_ERROR_OR_FAILURE]: {
    hasValidDocument: boolean;
  };
  [SdkEvents.PROVING_PASSPORT_NOT_SUPPORTED]: {
    countryCode: string | null;
    documentCategory: DocumentCategory | null;
  };
  [SdkEvents.PROVING_ACCOUNT_RECOVERY_REQUIRED]: undefined;
  [SdkEvents.DOCUMENT_COUNTRY_SELECTED]: {
    countryCode: string;
    countryName: string;
    documentTypes: string[];
  };
  [SdkEvents.DOCUMENT_TYPE_SELECTED]: {
    documentType: string;
    documentName: string;
    countryCode: string;
  };
  [SdkEvents.PROVING_BEGIN_GENERATION]: {
    uuid: string;
    isMock: boolean;
    context: ProofContext;
  };
  [SdkEvents.PROVING_AADHAAR_UPLOAD_SUCCESS]: undefined;
  [SdkEvents.PROVING_AADHAAR_UPLOAD_FAILURE]: { errorType: 'expired' | 'general' };

  [SdkEvents.PROGRESS]: Progress;
  [SdkEvents.ERROR]: Error;
  [SdkEvents.PROOF_EVENT]: {
    level: LogLevel;
    context: ProofContext;
    event: string;
    details?: Record<string, unknown>;
  };
  [SdkEvents.NFC_EVENT]: {
    level: LogLevel;
    context: NFCScanContext;
    event: string;
    details?: Record<string, unknown>;
  };
  [SdkEvents.DOCUMENT_MRZ_READ_SUCCESS]: undefined;
  [SdkEvents.DOCUMENT_MRZ_READ_FAILURE]: undefined;
  [SdkEvents.DOCUMENT_NFC_SCAN_SUCCESS]: undefined;
  [SdkEvents.DOCUMENT_OWNERSHIP_CONFIRMED]: {
    documentCategory?: DocumentCategory;
    signatureAlgorithm?: string;
    curveOrExponent?: string;
  };
}

/**
 * Event names supported by {@link SelfClient.on}. Use specific event literals
 * when subscribing to get accurate payload types from {@link SDKEventMap}.
 */
export type SDKEvent = keyof SDKEventMap;
