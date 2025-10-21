// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Redacts 9+ consecutive digits and MRZ-like blocks to reduce PII exposure
// TODO refactor usages in app to use this one
export const sanitizeErrorMessage = (msg: string): string => {
  try {
    return msg.replace(/\b\d{9,}\b/g, '[REDACTED]').replace(/[A-Z0-9<]{30,}/g, '[MRZ_REDACTED]');
  } catch {
    return 'redacted';
  }
};
