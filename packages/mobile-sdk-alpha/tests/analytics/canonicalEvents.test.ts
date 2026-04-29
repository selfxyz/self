// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import { OnboardingEvents } from '../../src/constants/analytics';

describe('OnboardingEvents canonical event names', () => {
  it.each([
    ['STARTED', 'Onboarding: Started'],
    ['COUNTRY_SELECTED', 'Onboarding: Country Selected'],
    ['DOCUMENT_TYPE_SELECTED', 'Onboarding: Document Type Selected'],
    ['SCAN_STARTED', 'Onboarding: Document Scan Started'],
    ['SCAN_SUCCEEDED', 'Onboarding: Document Scan Succeeded'],
    ['PROOF_STARTED', 'Onboarding: Proof Generation Started'],
    ['PROOF_SUCCEEDED', 'Onboarding: Proof Generation Succeeded'],
    ['COMPLETED', 'Onboarding: Completed'],
    ['FAILED', 'Onboarding: Failed'],
    ['STEP_RETRIED', 'Onboarding: Step Retried'],
    ['DISCLOSURE_COMPLETED', 'Onboarding: Disclosure Completed'],
  ] as const)('%s = %s', (key, expected) => {
    expect(OnboardingEvents[key]).toBe(expected);
  });

  it('contains exactly 11 events', () => {
    expect(Object.keys(OnboardingEvents)).toHaveLength(11);
  });
});
