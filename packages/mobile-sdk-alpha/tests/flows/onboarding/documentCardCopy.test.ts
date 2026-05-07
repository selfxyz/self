// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import { getDocumentDisplaySubtitle, getDocumentDisplayTitle } from '../../../src/flows/onboarding/documentCardCopy';

describe('document card copy', () => {
  it('uses country-qualified titles for biometric documents', () => {
    expect(getDocumentDisplayTitle('p', 'IND')).toBe('Indian Passport');
    expect(getDocumentDisplayTitle('i', 'IND')).toBe('Indian ID card');
    expect(getDocumentDisplayTitle('a', 'IND')).toBe('Indian Aadhaar');
  });

  it('matches the updated subtitle copy', () => {
    expect(getDocumentDisplaySubtitle('p', 'IND')).toBe('Verified Passport');
    expect(getDocumentDisplaySubtitle('i', 'IND')).toBe('Verified ID card');
    expect(getDocumentDisplaySubtitle('a', 'IND')).toBe('Verified India Aadhaar');
    expect(getDocumentDisplaySubtitle('kyc', 'IND')).toBe("National ID, Driver's License etc.");
  });

  it('normalizes German passport country codes', () => {
    expect(getDocumentDisplayTitle('p', 'D<<')).toBe('German Passport');
  });
});
