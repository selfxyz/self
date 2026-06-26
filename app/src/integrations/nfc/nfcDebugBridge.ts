// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { NfcDebugBridgeOptions } from '@/integrations/nfc/passportReader';
import { nfcDebugBridge as bridge } from '@/integrations/nfc/passportReader';

export type { NfcDebugBridgeOptions };

/**
 * Orchestration over the on-device NFC-debug bridge. When armed, the phone dials
 * a WebSocket relay and serves a redacted device protocol over the live NFC tag
 * so a server-side AI agent can drive a real passport read. The MRZ/CAN are used
 * on-device for authentication and never leave the phone.
 */

export const isNfcDebugBridgeSupported = bridge.isSupported;

const YYMMDD = /^\d{6}$/;

/**
 * Arms the bridge. Validates inputs before the native call (same contract the
 * package's index.android.js asserts) and rejects with a readable message.
 */
export const startBridge = (opts: NfcDebugBridgeOptions): Promise<boolean> => {
  const relayUrl = opts.relayUrl?.trim();
  if (!relayUrl) {
    return Promise.reject(new Error('Relay URL is required.'));
  }
  if (!opts.documentNumber?.trim()) {
    return Promise.reject(new Error('Document number is required.'));
  }
  if (!YYMMDD.test(opts.dateOfBirth)) {
    return Promise.reject(new Error('Date of birth must be YYMMDD.'));
  }
  if (!YYMMDD.test(opts.dateOfExpiry)) {
    return Promise.reject(new Error('Date of expiry must be YYMMDD.'));
  }
  return bridge.start({
    relayUrl,
    documentNumber: opts.documentNumber.trim(),
    dateOfBirth: opts.dateOfBirth,
    dateOfExpiry: opts.dateOfExpiry,
    canNumber: opts.canNumber?.trim() || undefined,
  });
};

/** Disarms the bridge and tears down the relay connection. */
export const stopBridge = (): Promise<boolean> => bridge.stop();
