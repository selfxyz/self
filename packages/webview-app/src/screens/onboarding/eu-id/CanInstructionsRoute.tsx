// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { EuIdCanInstructionsScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../../utils/insets';

export const EuIdCanInstructionsRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic } = useSelfClient();
  const state = (location.state as { countryCode?: string; canValue?: string } | null) ?? {};

  const onClose = useCallback(() => {
    haptic.trigger('selection');
    navigate(-1);
  }, [haptic, navigate]);

  const onContinue = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('eu_id_can_continue');
    navigate('/onboarding/eu-id/nfc-instructions', {
      state: { ...state, useCan: true },
    });
  }, [analytics, haptic, navigate, state]);

  return (
    <EuIdCanInstructionsScreen
      insets={WEB_SAFE_AREA.insets}
      onClose={onClose}
      onContinue={onContinue}
      canValue={state.canValue}
    />
  );
};
