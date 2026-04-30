// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Alert } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight } from '@tamagui/lucide-icons';

import { slate200, slate500 } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import BugIcon from '@/assets/icons/bug_icon.svg';
import type { RootStackParamList } from '@/navigation';
import { ParameterSection } from '@/screens/dev/components/ParameterSection';
import { ScreenSelector } from '@/screens/dev/components/ScreenSelector';
import { useSettingStore } from '@/stores/settingStore';
import { IS_DEV_MODE } from '@/utils/devUtils';

interface DebugShortcutsSectionProps {
  navigation: NativeStackNavigationProp<RootStackParamList>;
}

interface ShortcutRowProps {
  label: string;
  onPress: () => void;
}

const ShortcutRow: React.FC<ShortcutRowProps> = ({ label, onPress }) => (
  <Button
    style={{ backgroundColor: 'white' }}
    borderColor={slate200}
    borderRadius="$2"
    height="$5"
    padding={0}
    onPress={onPress}
  >
    <XStack
      width="100%"
      justifyContent="space-between"
      paddingVertical="$3"
      paddingLeft="$4"
      paddingRight="$1.5"
    >
      <Text fontSize="$5" color={slate500} fontFamily={dinot}>
        {label}
      </Text>
      <ChevronRight color={slate500} strokeWidth={2.5} />
    </XStack>
  </Button>
);

export const DebugShortcutsSection: React.FC<DebugShortcutsSectionProps> = ({
  navigation,
}) => {
  const armTestRegistrationCircuit = useSettingStore(
    state => state.armTestRegistrationCircuit,
  );
  const armTestDscCircuit = useSettingStore(state => state.armTestDscCircuit);

  const handleStartTestRegistrationCircuit = () => {
    Alert.alert(
      'Test Registration Circuit',
      'The next document scan will skip the on-chain "already registered / nullified" checks and force the register circuit to run. The DSC tree check still runs, so the test cert\'s DSC must already be on-chain. The relayer will still reject duplicate registrations. Dev only.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: () => {
            armTestRegistrationCircuit();
            navigation.navigate('DocumentOnboarding');
          },
        },
      ],
    );
  };

  const handleStartTestDscCircuit = () => {
    Alert.alert(
      'Test DSC Circuit',
      'The next document scan will skip the on-chain DSC tree check and force the DSC circuit to run, even if the DSC is already registered. Use this to QA the DSC proof path. Dev only.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: () => {
            armTestDscCircuit();
            navigation.navigate('DocumentOnboarding');
          },
        },
      ],
    );
  };

  return (
    <ParameterSection
      icon={<BugIcon />}
      title="Debug Shortcuts"
      description="Jump directly to any screen for testing"
    >
      <YStack gap="$2">
        <ScreenSelector />
        {IS_DEV_MODE && (
          <ShortcutRow
            label="Test Referral Flow"
            onPress={() =>
              navigation.navigate('Home', { testReferralFlow: true })
            }
          />
        )}
        {IS_DEV_MODE && (
          <ShortcutRow
            label="Test Registration Circuit"
            onPress={handleStartTestRegistrationCircuit}
          />
        )}
        {IS_DEV_MODE && (
          <ShortcutRow
            label="Test DSC Circuit"
            onPress={handleStartTestDscCircuit}
          />
        )}
      </YStack>
    </ParameterSection>
  );
};
