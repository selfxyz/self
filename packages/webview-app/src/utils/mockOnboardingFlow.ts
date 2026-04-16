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

export type MockRegistrationOutcome = 'success' | 'kyc-failure' | 'registration-failure' | 'cancel' | 'demo';
export type PromptMockState = 'default' | 'existing-account';

const DEFAULT_OUTCOME: MockRegistrationOutcome = 'success';
const DEFAULT_PROMPT_MOCK: PromptMockState = 'default';
const MOCKS_ENABLED = import.meta.env.DEV;

export const createMockProviderResult = ({
  outcome,
  verificationId,
}: {
  outcome: MockRegistrationOutcome;
  verificationId?: string;
}): KycProviderResult => {
  if (!MOCKS_ENABLED) {
    throw new Error('createMockProviderResult must not be called outside dev mode');
  }

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
    case 'demo':
      return {
        status: 'success',
        verificationId: resolvedVerificationId,
        provider: 'mock-provider',
        completedAt: new Date().toISOString(),
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
    case 'demo':
      return value;
    default:
      return DEFAULT_OUTCOME;
  }
};

export const getMockOutcomeSearch = (outcome: MockRegistrationOutcome = DEFAULT_OUTCOME): string =>
  MOCKS_ENABLED ? `?mock=${outcome}` : '';

export const getPromptMockFromSearch = (search: string): PromptMockState => {
  if (!MOCKS_ENABLED) {
    return DEFAULT_PROMPT_MOCK;
  }

  const value = new URLSearchParams(search).get('mock');

  switch (value) {
    case 'default':
    case 'existing-account':
      return value;
    default:
      return DEFAULT_PROMPT_MOCK;
  }
};

export const getPromptMockSearch = (mock: PromptMockState = DEFAULT_PROMPT_MOCK): string =>
  MOCKS_ENABLED ? `?mock=${mock}` : '';

export const getProviderPath = (outcome: MockRegistrationOutcome): string =>
  `/onboarding/provider${getMockOutcomeSearch(outcome)}`;

export const isDemoMode = (search: string): boolean =>
  MOCKS_ENABLED && new URLSearchParams(search).get('mock') === 'demo';
