// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

export { InitError } from './InitError';

export { LivenessError } from './LivenessError';
export { MrzParseError } from './MrzParseError';
export { NfcParseError } from './NfcParseError';
export const SCANNER_ERROR_CODES = {
  UNAVAILABLE: 'SELF_ERR_SCANNER_UNAVAILABLE',
  NFC_NOT_SUPPORTED: 'SELF_ERR_NFC_NOT_SUPPORTED',
  INVALID_MODE: 'SELF_ERR_SCANNER_MODE',
} as const;

export { SdkError, type SdkErrorCategory, notImplemented, sdkError } from './SdkError';
