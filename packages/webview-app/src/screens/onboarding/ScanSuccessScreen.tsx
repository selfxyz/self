// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { ScanSuccessScreen as EuclidScanSuccessScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_INSETS } from '../../utils/insets';

export const ScanSuccessScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();

  const goHome = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('registration_success_finished');
    navigate('/', { state: { skipOnboardingRedirect: true } });
  }, [analytics, haptic, navigate]);

  return (
    <EuclidScanSuccessScreen
      insets={WEB_INSETS}
      navLabel="Registration"
      totalSteps={4}
      currentStep={4}
      title="Your ID is now registered"
      onClose={goHome}
      onFinish={goHome}
    />
  );
};
