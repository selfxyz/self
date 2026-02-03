// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { ScrollView } from 'react-native';
import { YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useSafeBottomPadding } from '@selfxyz/mobile-sdk-alpha/hooks';

import type { RootStackParamList } from '@/navigation';
import { useDangerZoneActions } from '@/screens/dev/hooks/useDangerZoneActions';
import { useNotificationHandlers } from '@/screens/dev/hooks/useNotificationHandlers';
import {
  DangerZoneSection,
  DebugShortcutsSection,
  DevTogglesSection,
  ErrorTestingSection,
  LogLevelSection,
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
  } = useDangerZoneActions();

  return (
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

        <LogLevelSection
          loggingSeverity={loggingSeverity}
          setLoggingSeverity={setLoggingSeverity}
        />

        {IS_DEV_MODE && <ErrorTestingSection />}

        <DangerZoneSection
          onClearSecrets={handleClearSecretsPress}
          onClearDocumentCatalog={handleClearDocumentCatalogPress}
          onClearPointEvents={handleClearPointEventsPress}
          onResetBackupState={handleResetBackupStatePress}
          onClearBackupEvents={handleClearBackupEventsPress}
        />
      </YStack>
    </ScrollView>
  );
};

export default DevSettingsScreen;
