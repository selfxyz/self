// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { createMockProviderResult, getMockOutcomeFromSearch, isDemoMode } from '../../utils/mockOnboardingFlow';

/**
 * Redirects `/tunnel/kyc` to `ProviderLaunchScreen` at `/onboarding/provider`
 * with the tunnel-specific `nextPath` injected into navigation state.
 *
 * In dev mode, supports `?mock=kyc-failure|registration-failure|cancel|success`
 * to skip the real provider and jump straight to the result screen.
 */
export const EmbedKycWrapper: React.FC = () => {
  const location = useLocation();
  const incomingState = (location.state as Record<string, unknown>) ?? {};
  const mockOutcome = getMockOutcomeFromSearch(location.search);

  if (isDemoMode(location.search)) {
    const pendingPath = `/tunnel/kyc-pending${location.search}`;
    return (
      <Navigate
        to="/onboarding/provider"
        replace
        state={{
          ...incomingState,
          backPath: pendingPath,
          nextPath: pendingPath,
        }}
      />
    );
  }

  if (import.meta.env.DEV && location.search.includes('mock=')) {
    return (
      <Navigate
        to="/tunnel/kyc-success"
        replace
        state={{ providerResult: createMockProviderResult({ outcome: mockOutcome }) }}
      />
    );
  }

  return (
    <Navigate
      to="/onboarding/provider"
      replace
      state={{
        ...incomingState,
        backPath: '/tunnel/tour/4',
        nextPath: '/tunnel/kyc-success',
      }}
    />
  );
};
