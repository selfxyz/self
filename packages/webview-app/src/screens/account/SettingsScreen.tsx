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
import { WEB_SAFE_AREA } from '../../utils/insets';

export const SettingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic, lifecycle } = useSelfClient();

  const handleBack = useCallback(() => {
    haptic.trigger('selection');
    navigate('/', { replace: true });
  }, [navigate, haptic]);

  const handleClose = useCallback(async () => {
    haptic.trigger('selection');
    analytics.trackEvent('settings_dismiss_pressed');
    lifecycle.dismiss({ reason: 'user_cancel' });
  }, [haptic, analytics, lifecycle]);

  return (
    <SettingsViewScreen
      {...WEB_SAFE_AREA}
      escapeIcon={({ size, color }) => <LeftArrowIcon size={size} color={color} />}
      infoIcon={({ size, color }) => <QuestionCircleStrokeIcon size={size} color={color} />}
      onClose={handleBack}
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
              description: 'Your registered passports and IDs',
              onPress: () => {
                haptic.trigger('selection');
                navigate('/docs');
              },
            },
            {
              icon: LockIcon,
              label: 'Security',
              description: 'Recovery phrase, passport data',
              onPress: () => {
                haptic.trigger('selection');
                navigate('/settings/security');
              },
            },
            {
              icon: NotificationIcon,
              label: 'Notifications',
              description: 'Preferences, notification types',
              onPress: () => {
                haptic.trigger('selection');
                navigate('/settings/notifications');
              },
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
              onPress: () => {
                haptic.trigger('selection');
                navigate('/coming-soon');
              },
            },
            {
              icon: ShareIcon,
              label: 'Share Self',
              description: 'Share Self with friends',
              onPress: () => {
                haptic.trigger('selection');
                navigate('/coming-soon');
              },
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
              onPress: () => {
                haptic.trigger('selection');
                navigate('/settings/dev-mode');
              },
            },
            {
              icon: CodeIcon,
              label: 'Disclosure demo',
              description: 'Mock disclosure request (name, nationality, age, DOB)',
              onPress: () => {
                haptic.trigger('selection');
                navigate(
                  '/disclose/request?disclosures=name,nationality,age_above_18,date_of_birth&appName=Playground&appEndpoint=https%3A%2F%2Fplayground.staging.self.xyz%2Fapi%2Fverify&environment=stg&endpointType=staging_https&userIdType=hex&userId=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
                );
              },
            },
            {
              icon: CodeIcon,
              label: 'Tunnel flow',
              description: 'Demo: register + disclose in one flow',
              onPress: () => {
                haptic.trigger('selection');
                navigate('/tour/1');
              },
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
          onPress: handleClose,
        },
      ]}
    />
  );
};
