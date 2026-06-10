// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { PointsScreen as EuclidPointsScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

export const PointsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();

  const onReferralPress = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('points_referral_pressed');
    navigate('/points/invite');
  }, [analytics, haptic, navigate]);

  const onEarnButtonPress = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('points_earn_pressed');
  }, [analytics, haptic]);

  return (
    <EuclidPointsScreen
      {...WEB_SAFE_AREA}
      points={0}
      onEarnButtonPress={onEarnButtonPress}
      onEarnTabPress={() => haptic.trigger('selection')}
      onPointsTabPress={() => haptic.trigger('selection')}
      onReferralPress={onReferralPress}
      initialTab="points"
      historyItems={[]}
      apps={[]}
    />
  );
};
