// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { KycFailureScreen as EuclidKycFailureScreen } from '@selfxyz/euclid';

import { MockRegistrationFailureButton } from '../../components/MockRegistrationFailureButton';
import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';
import type { MockOnboardingNavigationState } from '../../utils/mockOnboardingFlow';
import { getProviderPath } from '../../utils/mockOnboardingFlow';

export const KycFailureScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic } = useSelfClient();
  const state = (location.state as MockOnboardingNavigationState | null) ?? null;

  const handleDismiss = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('kyc_failure_dismissed');
    navigate('/', { state: { skipOnboardingRedirect: true } });
  }, [analytics, haptic, navigate]);

  const handleTryAgain = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('kyc_failure_retry_pressed');
    navigate(getProviderPath(state?.retryMockOutcome ?? 'success'), {
      state: {
        countryCode: state?.countryCode,
        documentType: state?.documentType,
      },
    });
  }, [analytics, haptic, navigate, state?.countryCode, state?.documentType, state?.retryMockOutcome]);

  return (
    <>
      <MockRegistrationFailureButton />
      <EuclidKycFailureScreen {...WEB_SAFE_AREA} onDismiss={handleDismiss} onTryAgain={handleTryAgain} />
    </>
  );
};
