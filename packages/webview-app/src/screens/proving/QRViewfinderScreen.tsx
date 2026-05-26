// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { QRViewfinderScreen as EuclidQRViewfinderScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

export const QRViewfinderScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();

  const handleBack = useCallback(() => {
    haptic.trigger('selection');
    navigate(-1);
  }, [haptic, navigate]);

  const onInfoPress = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('qr_viewfinder_info_pressed');
  }, [analytics, haptic]);

  const onHowItWorks = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('qr_viewfinder_how_pressed');
  }, [analytics, haptic]);

  return (
    <EuclidQRViewfinderScreen
      {...WEB_SAFE_AREA}
      onClose={handleBack}
      onInfoPress={onInfoPress}
      onHowItWorks={onHowItWorks}
    />
  );
};
