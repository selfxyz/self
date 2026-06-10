// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { PassportInstructionsScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../../utils/insets';

export const PassportInstructionsRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic } = useSelfClient();
  const state = (location.state as { countryCode?: string } | null) ?? {};

  const handleBack = useCallback(() => {
    haptic.trigger('selection');
    navigate(-1);
  }, [haptic, navigate]);

  const handleContinue = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('passport_instructions_continue');
    navigate('/capture/passport/code-scan-instructions', {
      state,
    });
  }, [analytics, haptic, navigate, state]);

  return <PassportInstructionsScreen insets={WEB_SAFE_AREA.insets} onClose={handleBack} onContinue={handleContinue} />;
};
