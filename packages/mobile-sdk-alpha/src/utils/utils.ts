// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Redacts sensitive identifiers from error messages before they are forwarded
 * to analytics or logs. The helper replaces long digit sequences (such as MRZ
 * numbers or Aadhaar IDs) and ICAO-style MRZ blocks with sentinel strings. When
 * sanitisation fails, the function returns the literal `'redacted'` so callers
 * never leak user data.
 */
export const sanitizeErrorMessage = (msg: string): string => {
  try {
    return msg.replace(/\b\d{9,}\b/g, '[REDACTED]').replace(/[A-Z0-9<]{30,}/g, '[MRZ_REDACTED]');
  } catch {
    return 'redacted';
  }
};
