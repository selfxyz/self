// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  NotificationPreferencesScreen as EuclidNotificationPreferencesScreen,
  LeftArrowIcon,
} from '@selfxyz/euclid-web';

import { useSelfClient } from '../../providers/SelfClientProvider';

const defaultToggles = [
  { key: 'self', label: 'Allow Self notifications', description: 'App updates and more' },
  { key: 'nova', label: 'Allow Nova notifications', description: 'Never miss a mission' },
  { key: 'points', label: 'Allow Self Points notifications', description: 'Points and rewards' },
  { key: 'id_status', label: 'Allow ID status notifications', description: 'Document verification updates' },
];

export const NotificationPreferencesScreen: React.FC = () => {
  const navigate = useNavigate();
  const { analytics, haptic } = useSelfClient();
  const [toggleValues, setToggleValues] = useState<Record<string, boolean>>({
    self: true,
    nova: true,
    points: true,
    id_status: false,
  });

  const onBack = useCallback(() => {
    haptic.trigger('selection');
    navigate('/settings');
  }, [navigate, haptic]);

  const toggles = defaultToggles.map(t => ({
    label: t.label,
    description: t.description,
    value: toggleValues[t.key] ?? false,
    onToggleChange: (value: boolean) => {
      haptic.trigger('selection');
      analytics.trackEvent('notification_toggle_changed', { key: t.key, value });
      setToggleValues(prev => ({ ...prev, [t.key]: value }));
    },
  }));

  return (
    <EuclidNotificationPreferencesScreen
      insets={{ top: 0, bottom: 0 }}
      escapeIcon={({ size, color }) => (
        <LeftArrowIcon size={size} color={color} />
      )}
      onBack={onBack}
      toggles={toggles}
    />
  );
};
