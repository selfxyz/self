// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Redirects `/tunnel/kyc` to `ProviderLaunchScreen` at `/onboarding/provider`
 * with the tunnel-specific `nextPath` injected into navigation state.
 */
export const TunnelKycWrapper: React.FC = () => {
  const location = useLocation();
  const incomingState = (location.state as Record<string, unknown>) ?? {};

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
