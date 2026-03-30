// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { PushNotificationPromptScreen as EuclidPushNotificationPromptScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';
import { getPromptMockFromSearch, getPromptMockSearch, shouldUseHistoryBack } from '../../utils/mockOnboardingFlow';

export const PushNotificationPromptScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();
  const mock = getPromptMockFromSearch(location.search);

  const onEnableNotifications = useCallback(() => {
    haptic.trigger('success');
    analytics.trackEvent('push_notification_enabled', { mock });
    navigate('/');
  }, [mock, navigate, haptic, analytics]);

  const onDismiss = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('push_notification_dismissed', { mock });
    navigate('/');
  }, [mock, navigate, haptic, analytics]);

  const onClose = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('push_notification_header_back', { mock });

    if (shouldUseHistoryBack()) {
      navigate(-1);
      return;
    }

    navigate(`/onboarding/backup${getPromptMockSearch(mock)}`);
  }, [mock, navigate, haptic, analytics]);

  return (
    <EuclidPushNotificationPromptScreen
      insets={WEB_SAFE_AREA.insets}
      onEnableNotifications={onEnableNotifications}
      onDismiss={onDismiss}
      onClose={onClose}
    />
  );
};
