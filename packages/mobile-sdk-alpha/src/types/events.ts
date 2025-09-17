// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { DocumentCategory } from '@selfxyz/common/types';

import type { Progress } from './public';

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
   * **Recommended:** Navigate to an unsupported document screen showing the detected country code and
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
}

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

  [SdkEvents.PROGRESS]: Progress;
  [SdkEvents.ERROR]: Error;
}

export type SDKEvent = keyof SDKEventMap;
