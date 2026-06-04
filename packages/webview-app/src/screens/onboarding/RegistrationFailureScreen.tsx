// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { RegistrationFailureScreen as EuclidRegistrationFailureScreen } from '@selfxyz/euclid';

import { CorrelationReference } from '../../components/CorrelationReference';
import { MockRegistrationFailureButton } from '../../components/MockRegistrationFailureButton';
import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

export const RegistrationFailureScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();

  const handleClose = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('registration_failure_dismissed');
    navigate('/', { state: { skipOnboardingRedirect: true } });
  }, [analytics, haptic, navigate]);

  const handleRetry = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('registration_failure_try_again');
    navigate('/tour/1');
  }, [analytics, haptic, navigate]);

  return (
    <>
      <MockRegistrationFailureButton />
      <EuclidRegistrationFailureScreen
        {...WEB_SAFE_AREA}
        onDismiss={handleClose}
        onTryDifferentMethod={handleRetry}
        copy={{ tryDifferentMethod: 'Try again' }}
      />
      <CorrelationReference />
    </>
  );
};
