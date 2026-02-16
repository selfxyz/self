// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Alert } from 'react-native';

import { unsafe_clearSecrets } from '@/providers/authProvider';
import { usePassport } from '@/providers/passportDataProvider';
import { usePendingKycStore } from '@/stores/pendingKycStore';
import { usePointEventStore } from '@/stores/pointEventStore';
import { useSettingStore } from '@/stores/settingStore';

export const useDangerZoneActions = () => {
  const { clearDocumentCatalogForMigrationTesting } = usePassport();
  const clearPointEvents = usePointEventStore(state => state.clearEvents);
  const { resetBackupForPoints } = useSettingStore();
  const { pendingVerifications } = usePendingKycStore();
  const clearPendingVerifications = usePendingKycStore(
    state => state.clearAllPendingVerifications,
  );

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
            try {
              await unsafe_clearSecrets();
              Alert.alert('Success', 'Keychain secrets cleared successfully.', [
                { text: 'OK' },
              ]);
            } catch (error) {
              console.error(
                'Failed to clear keychain secrets:',
                error instanceof Error ? error.message : String(error),
              );
              Alert.alert(
                'Error',
                'Failed to clear keychain secrets. Please try again.',
                [{ text: 'OK' }],
              );
            }
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
            try {
              await clearDocumentCatalogForMigrationTesting();
              Alert.alert(
                'Success',
                'Document catalog cleared successfully. Please restart the app to test migration.',
                [{ text: 'OK' }],
              );
            } catch (error) {
              console.error(
                'Failed to clear document catalog:',
                error instanceof Error ? error.message : String(error),
              );
              Alert.alert(
                'Error',
                'Failed to clear document catalog. Please try again.',
                [{ text: 'OK' }],
              );
            }
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
            try {
              await clearPointEvents();
              Alert.alert('Success', 'Point events cleared successfully.', [
                { text: 'OK' },
              ]);
            } catch (error) {
              console.error(
                'Failed to clear point events:',
                error instanceof Error ? error.message : String(error),
              );
              Alert.alert(
                'Error',
                'Failed to clear point events. Please try again.',
                [{ text: 'OK' }],
              );
            }
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
            try {
              const events = usePointEventStore.getState().events;
              const backupEvents = events.filter(
                event => event.type === 'backup',
              );
              await Promise.all(
                backupEvents.map(event =>
                  usePointEventStore.getState().removeEvent(event.id),
                ),
              );
              Alert.alert('Success', 'Backup events cleared successfully.', [
                { text: 'OK' },
              ]);
            } catch (error) {
              console.error(
                'Failed to clear backup events:',
                error instanceof Error ? error.message : String(error),
              );
              Alert.alert(
                'Error',
                'Failed to clear backup events. Please try again.',
                [{ text: 'OK' }],
              );
            }
          },
        },
      ],
    );
  };

  const handleClearPendingVerificationsPress = () => {
    Alert.alert(
      'Clear Pending KYC Verifications',
      `Are you sure you want to clear all pending KYC verifications?\n\nCurrently ${pendingVerifications.length} verification(s) pending.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearPendingVerifications();
            Alert.alert(
              'Success',
              'Pending KYC verifications cleared successfully.',
              [{ text: 'OK' }],
            );
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
    handleClearPendingVerificationsPress,
  };
};
