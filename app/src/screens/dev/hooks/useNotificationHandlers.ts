// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState } from 'react-native';

import {
  isNotificationSystemReady,
  requestNotificationPermission,
  subscribeToTopics,
  unsubscribeFromTopics,
} from '@/services/notifications/notificationService';
import { useSettingStore } from '@/stores/settingStore';

export const useNotificationHandlers = () => {
  const subscribedTopics = useSettingStore(state => state.subscribedTopics);
  const [hasNotificationPermission, setHasNotificationPermission] =
    useState(false);

  const checkPermissions = useCallback(async () => {
    const readiness = await isNotificationSystemReady();
    setHasNotificationPermission(readiness.ready);
  }, []);

  // Check notification permissions on mount and when app regains focus
  useEffect(() => {
    checkPermissions();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkPermissions();
      }
    });

    return () => subscription.remove();
  }, [checkPermissions]);

  const handleTopicToggle = async (topics: string[], topicLabel: string) => {
    // Check permissions first
    if (!hasNotificationPermission) {
      Alert.alert(
        'Permissions Required',
        'Push notifications are not enabled. Would you like to enable them?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: async () => {
              try {
                const granted = await requestNotificationPermission();
                if (granted) {
                  // Update permission state
                  setHasNotificationPermission(true);
                  Alert.alert(
                    'Success',
                    'Permissions granted! You can now subscribe to topics.',
                    [{ text: 'OK' }],
                  );
                } else {
                  Alert.alert(
                    'Failed',
                    'Could not enable notifications. Please enable them in your device Settings.',
                    [{ text: 'OK' }],
                  );
                }
              } catch (error) {
                Alert.alert(
                  'Error',
                  error instanceof Error
                    ? error.message
                    : 'Failed to request permissions',
                  [{ text: 'OK' }],
                );
              }
            },
          },
        ],
      );
      return;
    }

    const isCurrentlySubscribed = topics.every(topic =>
      subscribedTopics.includes(topic),
    );

    if (isCurrentlySubscribed) {
      // Show confirmation dialog for unsubscribe
      Alert.alert(
        'Disable Notifications',
        `Are you sure you want to disable push notifications for ${topicLabel}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              try {
                const result = await unsubscribeFromTopics(topics);
                if (result.successes.length > 0) {
                  Alert.alert(
                    'Success',
                    `Disabled notifications for ${topicLabel}`,
                    [{ text: 'OK' }],
                  );
                } else {
                  Alert.alert(
                    'Error',
                    `Failed to disable: ${result.failures.map(f => f.error).join(', ')}`,
                    [{ text: 'OK' }],
                  );
                }
              } catch (error) {
                Alert.alert(
                  'Error',
                  error instanceof Error
                    ? error.message
                    : 'Failed to unsubscribe',
                  [{ text: 'OK' }],
                );
              }
            },
          },
        ],
      );
    } else {
      // Subscribe without confirmation
      try {
        const result = await subscribeToTopics(topics);
        if (result.successes.length > 0) {
          Alert.alert('✅ Success', `Enabled notifications for ${topicLabel}`, [
            { text: 'OK' },
          ]);
        } else {
          Alert.alert(
            'Error',
            `Failed to enable: ${result.failures.map(f => f.error).join(', ')}`,
            [{ text: 'OK' }],
          );
        }
      } catch (error) {
        Alert.alert(
          'Error',
          error instanceof Error ? error.message : 'Failed to subscribe',
          [{ text: 'OK' }],
        );
      }
    }
  };

  return {
    hasNotificationPermission,
    subscribedTopics,
    handleTopicToggle,
  };
};
