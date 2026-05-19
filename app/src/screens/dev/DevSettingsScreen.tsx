// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { ScrollView } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronRight } from '@tamagui/lucide-icons';

import { red500, white } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';
import { useSafeBottomPadding } from '@selfxyz/mobile-sdk-alpha/hooks';

import BugIcon from '@/assets/icons/bug_icon.svg';
import ErrorBoundary from '@/components/ErrorBoundary';
import type { RootStackParamList } from '@/navigation';
import { ErrorInjectionSelector } from '@/screens/dev/components/ErrorInjectionSelector';
import { LogLevelSelector } from '@/screens/dev/components/LogLevelSelector';
import { ParameterSection } from '@/screens/dev/components/ParameterSection';
import { useNotificationHandlers } from '@/screens/dev/hooks/useNotificationHandlers';
import {
  DebugShortcutsSection,
  DevTogglesSection,
  PushNotificationsSection,
  SentryTestSection,
} from '@/screens/dev/sections';
import { useSettingStore } from '@/stores/settingStore';
import { IS_DEV_MODE } from '@/utils/devUtils';

const DevSettingsScreen: React.FC = () => {
  const navigation =
    useNavigation() as NativeStackScreenProps<RootStackParamList>['navigation'];
  const paddingBottom = useSafeBottomPadding(20);

  const loggingSeverity = useSettingStore(state => state.loggingSeverity);
  const setLoggingSeverity = useSettingStore(state => state.setLoggingSeverity);
  const useStrongBox = useSettingStore(state => state.useStrongBox);
  const setUseStrongBox = useSettingStore(state => state.setUseStrongBox);

  const { hasNotificationPermission, subscribedTopics, handleTopicToggle } =
    useNotificationHandlers();

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
            collapsible
            defaultCollapsed
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
              collapsible
              defaultCollapsed
            >
              <ErrorInjectionSelector />
            </ParameterSection>
          )}

          <SentryTestSection />

          <Button
            style={{ backgroundColor: red500 }}
            borderRadius="$4"
            height="$5"
            width="100%"
            padding={0}
            onPress={() => navigation.navigate('DevDangerZone')}
          >
            <XStack
              width="100%"
              justifyContent="space-between"
              alignItems="center"
              paddingVertical="$3"
              paddingLeft="$4"
              paddingRight="$3"
            >
              <Text fontSize="$5" color={white} fontFamily={dinot}>
                Danger zone
              </Text>
              <ChevronRight color={white} strokeWidth={2.5} />
            </XStack>
          </Button>
        </YStack>
      </ScrollView>
    </ErrorBoundary>
  );
};

export default DevSettingsScreen;
