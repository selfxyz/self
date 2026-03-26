// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { KycProviderResult } from '../types/kycProvider';

export interface MockOnboardingNavigationState {
  countryCode?: string;
  documentType?: string;
  retryMockOutcome?: MockRegistrationOutcome;
  nextPath?: string;
}

export type MockRegistrationOutcome = 'success' | 'kyc-failure' | 'registration-failure' | 'cancel';

const DEFAULT_OUTCOME: MockRegistrationOutcome = 'success';
const MOCKS_ENABLED = import.meta.env.DEV;

export const createMockProviderResult = ({
  outcome,
  verificationId,
}: {
  outcome: MockRegistrationOutcome;
  verificationId?: string;
}): KycProviderResult => {
  const resolvedVerificationId = verificationId ?? 'mock-verification';

  switch (outcome) {
    case 'success':
      return {
        status: 'success',
        verificationId: resolvedVerificationId,
        provider: 'mock-provider',
        completedAt: new Date().toISOString(),
      };
    case 'kyc-failure':
      return {
        status: 'error',
        verificationId: resolvedVerificationId,
        provider: 'mock-provider',
        completedAt: new Date().toISOString(),
        error: {
          code: 'provider_unavailable',
          message: "We couldn't verify your ID this time. Please try again.",
          retryable: true,
        },
      };
    case 'registration-failure':
      return {
        status: 'error',
        verificationId: resolvedVerificationId,
        provider: 'mock-provider',
        completedAt: new Date().toISOString(),
        error: {
          code: 'provider_rejected',
          message: 'We were unable to register this document.',
          retryable: false,
        },
      };
    case 'cancel':
      return {
        status: 'cancel',
        verificationId: resolvedVerificationId,
        provider: 'mock-provider',
        completedAt: new Date().toISOString(),
        error: {
          code: 'provider_cancelled',
          message: 'Verification was cancelled.',
          retryable: true,
        },
      };
  }
};

export const getMockOutcomeFromSearch = (search: string): MockRegistrationOutcome => {
  if (!MOCKS_ENABLED) {
    return DEFAULT_OUTCOME;
  }

  const value = new URLSearchParams(search).get('mock');

  switch (value) {
    case 'success':
    case 'kyc-failure':
    case 'registration-failure':
    case 'cancel':
      return value;
    default:
      return DEFAULT_OUTCOME;
  }
};

export const getMockOutcomeSearch = (outcome: MockRegistrationOutcome = DEFAULT_OUTCOME): string =>
  MOCKS_ENABLED ? `?mock=${outcome}` : '';

export const getProviderPath = (outcome: MockRegistrationOutcome): string =>
  `/onboarding/provider${getMockOutcomeSearch(outcome)}`;
