// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { PassportNfcSuccessScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../../utils/insets';

export const PassportNfcSuccessRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic } = useSelfClient();
  const state =
    (location.state as { countryCode?: string } | null) ?? {};

  const onClose = useCallback(() => {
    haptic.trigger('selection');
    navigate('/');
  }, [haptic, navigate]);

  const onFinishRegistration = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('passport_registration_finished');
    navigate('/onboarding/success', { state, replace: true });
  }, [analytics, haptic, navigate, state]);

  return (
    <PassportNfcSuccessScreen
      insets={WEB_SAFE_AREA.insets}
      onClose={onClose}
      onFinishRegistration={onFinishRegistration}
    />
  );
};
