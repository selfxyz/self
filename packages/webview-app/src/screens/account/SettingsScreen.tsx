// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SettingsViewScreen,
  LeftArrowIcon,
  QuestionCircleStrokeIcon,
  DocumentDetailsIcon,
  LockIcon,
  CloudKeyIcon,
  ChatStrokeIcon,
  ShareIcon,
} from '@selfxyz/euclid-web';

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
      escapeIcon={({ size, color }) => (
        <LeftArrowIcon size={size} color={color} />
      )}
      infoIcon={({ size, color }) => (
        <QuestionCircleStrokeIcon size={size} color={color} />
      )}
      onClose={onBack}
      showBackupInfoBox={false}
      isBackupEnabled={false}
      CTAs={[]}
      sections={[
        {
          title: 'Account',
          items: [
            {
              icon: DocumentDetailsIcon,
              label: 'View document info',
              description: 'View your stored document details',
              onPress: () => navigate('/coming-soon'),
            },
            {
              icon: LockIcon,
              label: 'Recovery phrase',
              description: 'View your recovery phrase',
              onPress: () => navigate('/coming-soon'),
            },
            {
              icon: CloudKeyIcon,
              label: 'Cloud backup',
              description: 'Manage your cloud backup',
              onPress: () => navigate('/coming-soon'),
            },
          ],
        },
        {
          title: 'Support',
          items: [
            {
              icon: ChatStrokeIcon,
              label: 'Get support',
              description: 'Contact us for help',
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
