// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { sanitizeErrorMessage } from '../../src/utils/utils';

describe('sanitizeErrorMessage', () => {
  it('redacts sequences of 9+ digits', () => {
    const input = 'Passport number 123456789 should be hidden';
    const result = sanitizeErrorMessage(input);
    expect(result).toBe('Passport number [REDACTED] should be hidden');
  });

  it('does not redact short numbers (<9 digits)', () => {
    const input = 'Retry in 120 seconds. Code 12345678 only';
    const result = sanitizeErrorMessage(input);
    expect(result).toBe('Retry in 120 seconds. Code 12345678 only');
  });

  it('redacts MRZ-like long blocks (>=30 chars of A-Z0-9<)', () => {
    const mrzLike = 'P<USADOE<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<<<<';
    const suffix = ' additional context';
    const input = `${mrzLike}${suffix}`;
    const result = sanitizeErrorMessage(input);
    expect(result).toBe('[MRZ_REDACTED]' + suffix);
  });

  it('redacts multi-line MRZ (two lines of 44 chars)', () => {
    const line1 = 'A'.repeat(44);
    const line2 = 'B'.repeat(44);
    const suffix = ' context';
    const input = `${line1}\n${line2}${suffix}`;
    const result = sanitizeErrorMessage(input);
    expect(result).toBe('[MRZ_REDACTED]\n[MRZ_REDACTED]' + suffix);
  });

  it('redacts multiple occurrences in the same string', () => {
    const input = 'ids 123456789 and 987654321 are present';
    const result = sanitizeErrorMessage(input);
    expect(result).toBe('ids [REDACTED] and [REDACTED] are present');
  });

  it('returns "redacted" on unexpected errors', () => {
    // Simulate a failure by monkey-patching String.prototype.replace temporarily
    const originalReplace = (String.prototype as any).replace;
    (String.prototype as any).replace = () => {
      throw new Error('boom');
    };
    try {
      const result = sanitizeErrorMessage('any');
      expect(result).toBe('redacted');
    } finally {
      (String.prototype as any).replace = originalReplace;
    }
  });
});
