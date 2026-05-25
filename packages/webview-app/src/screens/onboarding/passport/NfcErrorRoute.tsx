// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { PassportNfcErrorScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../../utils/insets';

export const PassportNfcErrorRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic } = useSelfClient();
  const state =
    (location.state as {
      countryCode?: string;
      errorMessage?: string;
      stage?: 'mrz' | 'nfc';
    } | null) ?? {};

  const onClose = useCallback(() => {
    haptic.trigger('selection');
    navigate('/', { replace: true });
  }, [haptic, navigate]);

  const onStartOver = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('passport_scan_start_over', {
      stage: state.stage,
      error: state.errorMessage,
    });
    navigate('/onboarding/passport/instructions', {
      state: { countryCode: state.countryCode },
      replace: true,
    });
  }, [analytics, haptic, navigate, state]);

  const onTryDifferentMethod = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('passport_try_different_method', {
      stage: state.stage,
    });
    navigate('/onboarding/country', { replace: true });
  }, [analytics, haptic, navigate, state.stage]);

  return (
    <PassportNfcErrorScreen
      insets={WEB_SAFE_AREA.insets}
      onClose={onClose}
      onStartOver={onStartOver}
      onTryDifferentMethod={onTryDifferentMethod}
    />
  );
};
