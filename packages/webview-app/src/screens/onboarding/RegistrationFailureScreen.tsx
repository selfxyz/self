// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { RegistrationFailureScreen as EuclidRegistrationFailureScreen } from '@selfxyz/euclid';

import { MockRegistrationFailureButton } from '../../components/MockRegistrationFailureButton';
import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

export const RegistrationFailureScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();

  const handleDismiss = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('registration_failure_dismissed');
    navigate('/', { state: { skipOnboardingRedirect: true } });
  }, [analytics, haptic, navigate]);

  const handleTryDifferentMethod = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('registration_failure_try_again');
    navigate('/onboarding/tour/1');
  }, [analytics, haptic, navigate]);

  return (
    <>
      <MockRegistrationFailureButton />
      <EuclidRegistrationFailureScreen
        {...WEB_SAFE_AREA}
        onDismiss={handleDismiss}
        onTryDifferentMethod={handleTryDifferentMethod}
        copy={{ tryDifferentMethod: 'Try again' }}
      />
    </>
  );
};
