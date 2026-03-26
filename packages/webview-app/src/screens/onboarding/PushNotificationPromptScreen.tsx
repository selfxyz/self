// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { PushNotificationPromptScreen as EuclidPushNotificationPromptScreen } from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';
import { WEB_SAFE_AREA } from '../../utils/insets';

export const PushNotificationPromptScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();

  const onEnableNotifications = useCallback(() => {
    haptic.trigger('success');
    analytics.trackEvent('push_notification_enabled');
    navigate('/');
  }, [navigate, haptic, analytics]);

  const onDismiss = useCallback(() => {
    haptic.trigger('selection');
    analytics.trackEvent('push_notification_dismissed');
    navigate('/');
  }, [navigate, haptic, analytics]);

  return (
    <EuclidPushNotificationPromptScreen
      insets={WEB_SAFE_AREA.insets}
      onEnableNotifications={onEnableNotifications}
      onDismiss={onDismiss}
    />
  );
};
