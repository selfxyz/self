// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  ChatStrokeIcon,
  CodeIcon,
  DocumentDetailsIcon,
  LeftArrowIcon,
  LockIcon,
  NotificationIcon,
  QuestionCircleStrokeIcon,
  SettingsViewScreen,
  ShareIcon,
} from '@selfxyz/euclid';

import { useSelfClient } from '../../providers/SelfClientProvider';

export const SettingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic, lifecycle } = useSelfClient();

  const onBack = useCallback(() => {
    haptic.trigger('selection');
    navigate('/');
  }, [navigate, haptic]);

  const onDismiss = useCallback(async () => {
    haptic.trigger('selection');
    analytics.trackEvent('settings_dismiss_pressed');
    lifecycle.dismiss({ reason: 'user_cancel' });
  }, [haptic, analytics, lifecycle]);

  return (
    <SettingsViewScreen
      insets={{ top: 0, bottom: 0 }}
      escapeIcon={({ size, color }) => <LeftArrowIcon size={size} color={color} />}
      infoIcon={({ size, color }) => <QuestionCircleStrokeIcon size={size} color={color} />}
      onClose={onBack}
      showBackupInfoBox={false}
      isBackupEnabled={false}
      CTAs={[]}
      sections={[
        {
          title: 'App settings',
          items: [
            {
              icon: DocumentDetailsIcon,
              label: 'Manage Documents',
              description: 'Recovery phrase, passport data',
              onPress: () => navigate('/coming-soon'),
            },
            {
              icon: LockIcon,
              label: 'Security',
              description: 'Recovery phrase, passport data',
              onPress: () => navigate('/settings/security'),
            },
            {
              icon: NotificationIcon,
              label: 'Notifications',
              description: 'Preferences, notification types',
              onPress: () => navigate('/settings/notifications'),
            },
          ],
        },
        {
          title: 'Support & feedback',
          items: [
            {
              icon: ChatStrokeIcon,
              label: 'Get support',
              description: 'Help center & support',
              onPress: () => navigate('/coming-soon'),
            },
            {
              icon: ShareIcon,
              label: 'Share Self',
              description: 'Share Self with friends',
              onPress: () => navigate('/coming-soon'),
            },
          ],
        },
        {
          title: 'Developer tools',
          items: [
            {
              icon: CodeIcon,
              label: 'Dev mode',
              description: 'Manage mock IDs, simulate proofs',
              onPress: () => navigate('/settings/dev-mode'),
            },
            {
              icon: CodeIcon,
              label: 'Tunnel flow',
              description: 'Demo: register + disclose in one flow',
              onPress: () => navigate('/tunnel/tour/1'),
            },
          ],
        },
      ]}
      connectHeading=""
      connectSubheading=""
      connectButtons={[]}
      bottomSectionItems={[
        {
          label: 'Close Self',
          onPress: onDismiss,
        },
      ]}
    />
  );
};
