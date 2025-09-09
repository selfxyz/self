// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { DocumentCategory } from '@selfxyz/common/types';

import type { Progress } from './public';

export enum SdkEvents {
  ERROR = 'ERROR',
  PROGRESS = 'PROGRESS',
  STATE = 'STATE',

  PROVING_PASSPORT_DATA_NOT_FOUND = 'PROVING_PASSPORT_DATA_NOT_FOUND',
  PROVING_ACCOUNT_VERIFIED_SUCCESS = 'PROVING_ACCOUNT_VERIFIED_SUCCESS',
  PROVING_REGISTER_ERROR_OR_FAILURE = 'PROVING_REGISTER_ERROR_OR_FAILURE',
  PROVING_PASSPORT_NOT_SUPPORTED = 'PROVING_PASSPORT_NOT_SUPPORTED',
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
  [SdkEvents.STATE]: string;
  [SdkEvents.ERROR]: Error;
}

export type SDKEvent = keyof SDKEventMap;
