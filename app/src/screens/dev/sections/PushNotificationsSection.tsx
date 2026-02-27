// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { YStack } from 'tamagui';

import BugIcon from '@/assets/icons/bug_icon.svg';
import { ParameterSection } from '@/screens/dev/components/ParameterSection';
import { TopicToggleButton } from '@/screens/dev/components/TopicToggleButton';

interface PushNotificationsSectionProps {
  hasNotificationPermission: boolean;
  subscribedTopics: string[];
  onTopicToggle: (topics: string[], topicLabel: string) => void;
}

export const PushNotificationsSection: React.FC<
  PushNotificationsSectionProps
> = ({ hasNotificationPermission, subscribedTopics, onTopicToggle }) => {
  return (
    <ParameterSection
      icon={<BugIcon />}
      title="Push Notifications"
      description="Manage topic subscriptions"
    >
      <YStack gap="$2">
        <TopicToggleButton
          label="Starfall"
          isSubscribed={
            hasNotificationPermission && subscribedTopics.includes('nova')
          }
          onToggle={() => onTopicToggle(['nova'], 'Starfall')}
        />
        <TopicToggleButton
          label="General"
          isSubscribed={
            hasNotificationPermission && subscribedTopics.includes('general')
          }
          onToggle={() => onTopicToggle(['general'], 'General')}
        />
        <TopicToggleButton
          label="Both (Starfall + General)"
          isSubscribed={
            hasNotificationPermission &&
            subscribedTopics.includes('nova') &&
            subscribedTopics.includes('general')
          }
          onToggle={() => onTopicToggle(['nova', 'general'], 'both topics')}
        />
      </YStack>
    </ParameterSection>
  );
};
