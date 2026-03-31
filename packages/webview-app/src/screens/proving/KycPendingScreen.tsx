// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { KycPendingScreen as EuclidKycPendingScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

export const KycPendingScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();

  const onCheckBackLater = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('kyc_pending_check_back_later');
    navigate('/');
  }, [navigate, haptic, analytics]);

  const onReceiveLiveUpdates = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('kyc_pending_live_updates');
    navigate('/settings/notifications');
  }, [navigate, haptic, analytics]);

  return (
    <EuclidKycPendingScreen
      insets={WEB_SAFE_AREA.insets}
      onCheckBackLater={onCheckBackLater}
      onReceiveLiveUpdates={onReceiveLiveUpdates}
    />
  );
};
