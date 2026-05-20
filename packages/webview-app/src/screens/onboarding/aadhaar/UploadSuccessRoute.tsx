// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { AadhaarUploadSuccessScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../../utils/insets';

export const AadhaarUploadSuccessRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analytics, haptic } = useSelfClient();
  const state =
    (location.state as { countryCode?: string } | null) ?? {};

  const onClose = useCallback(() => {
    haptic.trigger('selection');
    navigate('/');
  }, [haptic, navigate]);

  const onContinue = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('aadhaar_upload_success_continue');
    navigate('/onboarding/success', { state, replace: true });
  }, [analytics, haptic, navigate, state]);

  return (
    <AadhaarUploadSuccessScreen
      insets={WEB_SAFE_AREA.insets}
      onClose={onClose}
      onContinue={onContinue}
    />
  );
};
