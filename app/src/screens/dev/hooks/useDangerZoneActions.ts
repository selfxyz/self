// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Alert } from 'react-native';

import { unsafe_clearSecrets } from '@/providers/authProvider';
import { usePassport } from '@/providers/passportDataProvider';
import { usePointEventStore } from '@/stores/pointEventStore';
import { useSettingStore } from '@/stores/settingStore';

export const useDangerZoneActions = () => {
  const { clearDocumentCatalogForMigrationTesting } = usePassport();
  const clearPointEvents = usePointEventStore(state => state.clearEvents);
  const { resetBackupForPoints } = useSettingStore();

  const handleClearSecretsPress = () => {
    Alert.alert(
      'Delete Keychain Secrets',
      "Are you sure you want to remove your keychain secrets?\n\nIf this secret is not backed up, your account will be lost and the ID documents attached to it won't be usable.",
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await unsafe_clearSecrets();
          },
        },
      ],
    );
  };

  const handleClearDocumentCatalogPress = () => {
    Alert.alert(
      'Clear Document Catalog',
      'Are you sure you want to clear the document catalog?\n\nThis will remove all documents from the new storage system but preserve legacy storage for migration testing. You will need to restart the app to test migration.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearDocumentCatalogForMigrationTesting();
          },
        },
      ],
    );
  };

  const handleClearPointEventsPress = () => {
    Alert.alert(
      'Clear Point Events',
      'Are you sure you want to clear all point events from local storage?\n\nThis will reset your point history but not affect your actual points on the blockchain.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearPointEvents();
            Alert.alert('Success', 'Point events cleared successfully.', [
              { text: 'OK' },
            ]);
          },
        },
      ],
    );
  };

  const handleResetBackupStatePress = () => {
    Alert.alert(
      'Reset Backup State',
      'Are you sure you want to reset the backup state?\n\nThis will allow you to see and trigger the backup points flow again.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetBackupForPoints();
            Alert.alert('Success', 'Backup state reset successfully.', [
              { text: 'OK' },
            ]);
          },
        },
      ],
    );
  };

  const handleClearBackupEventsPress = () => {
    Alert.alert(
      'Clear Backup Events',
      'Are you sure you want to clear all backup point events from local storage?\n\nThis will remove backup events from your point history.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const events = usePointEventStore.getState().events;
            const backupEvents = events.filter(
              event => event.type === 'backup',
            );
            for (const event of backupEvents) {
              await usePointEventStore.getState().removeEvent(event.id);
            }
            Alert.alert('Success', 'Backup events cleared successfully.', [
              { text: 'OK' },
            ]);
          },
        },
      ],
    );
  };

  return {
    handleClearSecretsPress,
    handleClearDocumentCatalogPress,
    handleClearPointEventsPress,
    handleResetBackupStatePress,
    handleClearBackupEventsPress,
  };
};
