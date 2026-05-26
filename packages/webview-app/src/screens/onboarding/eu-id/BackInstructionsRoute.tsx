// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { EuIdBackInstructionsScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../../utils/insets';

export const EuIdBackInstructionsRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic } = useSelfClient();
  const state = (location.state as { countryCode?: string } | null) ?? {};

  const handleBack = useCallback(() => {
    haptic.trigger('selection');
    navigate(-1);
  }, [haptic, navigate]);

  const onNeedHelp = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('eu_id_back_need_help');
    navigate('/capture/eu-id/can-instructions', { state });
  }, [analytics, haptic, navigate, state]);

  const handleContinue = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('eu_id_back_continue');
    navigate('/capture/eu-id/code-scan-viewfinder', { state });
  }, [analytics, haptic, navigate, state]);

  return (
    <EuIdBackInstructionsScreen
      insets={WEB_SAFE_AREA.insets}
      onClose={handleBack}
      onNeedHelp={onNeedHelp}
      onContinue={handleContinue}
    />
  );
};
