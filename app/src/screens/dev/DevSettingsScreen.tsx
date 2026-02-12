// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Alert, ScrollView } from 'react-native';
import { YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useSafeBottomPadding } from '@selfxyz/mobile-sdk-alpha/hooks';

import BugIcon from '@/assets/icons/bug_icon.svg';
import ErrorBoundary from '@/components/ErrorBoundary';
import type { RootStackParamList } from '@/navigation';
import {
  loadDocumentCatalogDirectlyFromKeychain,
  saveDocumentCatalogDirectlyToKeychain,
} from '@/providers/passportDataProvider';
import { ErrorInjectionSelector } from '@/screens/dev/components/ErrorInjectionSelector';
import { LogLevelSelector } from '@/screens/dev/components/LogLevelSelector';
import { ParameterSection } from '@/screens/dev/components/ParameterSection';
import { useDangerZoneActions } from '@/screens/dev/hooks/useDangerZoneActions';
import { useNotificationHandlers } from '@/screens/dev/hooks/useNotificationHandlers';
import {
  DangerZoneSection,
  DebugShortcutsSection,
  DevTogglesSection,
  PushNotificationsSection,
} from '@/screens/dev/sections';
import { useSettingStore } from '@/stores/settingStore';
import { IS_DEV_MODE } from '@/utils/devUtils';

const DevSettingsScreen: React.FC = () => {
  const navigation =
    useNavigation() as NativeStackScreenProps<RootStackParamList>['navigation'];
  const paddingBottom = useSafeBottomPadding(20);

  // Settings store
  const loggingSeverity = useSettingStore(state => state.loggingSeverity);
  const setLoggingSeverity = useSettingStore(state => state.setLoggingSeverity);
  const useStrongBox = useSettingStore(state => state.useStrongBox);
  const setUseStrongBox = useSettingStore(state => state.setUseStrongBox);
  const kycEnabled = useSettingStore(state => state.kycEnabled);
  const setKycEnabled = useSettingStore(state => state.setKycEnabled);

  // Custom hooks
  const { hasNotificationPermission, subscribedTopics, handleTopicToggle } =
    useNotificationHandlers();
  const {
    handleClearSecretsPress,
    handleClearDocumentCatalogPress,
    handleClearPointEventsPress,
    handleResetBackupStatePress,
    handleClearBackupEventsPress,
    handleClearPendingVerificationsPress,
  } = useDangerZoneActions();

  const handleRemoveExpirationDateFlagPress = () => {
    Alert.alert(
      'Remove Expiration Date Flag',
      'Are you sure you want to remove the expiration date flag for the current (selected) document?.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const catalog = await loadDocumentCatalogDirectlyFromKeychain();
            const selectedDocumentId = catalog.selectedDocumentId;
            const selectedDocument = catalog.documents.find(
              document => document.id === selectedDocumentId,
            );

            if (selectedDocument) {
              delete selectedDocument.hasExpirationDate;

              await saveDocumentCatalogDirectlyToKeychain(catalog);
            }
          },
        },
      ],
    );
  };
  return (
    <ErrorBoundary>
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack
          gap="$3"
          alignItems="center"
          backgroundColor="white"
          flex={1}
          paddingHorizontal="$4"
          paddingTop="$4"
          paddingBottom={paddingBottom}
        >
          <DebugShortcutsSection navigation={navigation} />

          {IS_DEV_MODE && (
            <DevTogglesSection
              kycEnabled={kycEnabled}
              setKycEnabled={setKycEnabled}
              useStrongBox={useStrongBox}
              setUseStrongBox={setUseStrongBox}
            />
          )}

          <PushNotificationsSection
            hasNotificationPermission={hasNotificationPermission}
            subscribedTopics={subscribedTopics}
            onTopicToggle={handleTopicToggle}
          />

          <ParameterSection
            icon={<BugIcon />}
            title="Log Level"
            description="Configure logging verbosity"
          >
            <LogLevelSelector
              currentLevel={loggingSeverity}
              onSelect={setLoggingSeverity}
            />
          </ParameterSection>

          {IS_DEV_MODE && (
            <ParameterSection
              icon={<BugIcon />}
              title="Onboarding Error Testing"
              description="Test onboarding error flows"
            >
              <ErrorInjectionSelector />
            </ParameterSection>
          )}

          <DangerZoneSection
            onClearSecrets={handleClearSecretsPress}
            onClearDocumentCatalog={handleClearDocumentCatalogPress}
            onClearPointEvents={handleClearPointEventsPress}
            onResetBackupState={handleResetBackupStatePress}
            onClearBackupEvents={handleClearBackupEventsPress}
            onClearPendingKyc={handleClearPendingVerificationsPress}
            onRemoveExpirationDateFlag={handleRemoveExpirationDateFlagPress}
          />
        </YStack>
      </ScrollView>
    </ErrorBoundary>
  );
};

export default DevSettingsScreen;
