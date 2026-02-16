// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Button, Text, XStack, YStack } from 'tamagui';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight } from '@tamagui/lucide-icons/icons/ChevronRight';

import { slate200, slate500 } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import BugIcon from '@/assets/icons/bug_icon.svg';
import type { RootStackParamList } from '@/navigation';
import { ParameterSection } from '@/screens/dev/components/ParameterSection';
import { ScreenSelector } from '@/screens/dev/components/ScreenSelector';
import { IS_DEV_MODE } from '@/utils/devUtils';

interface DebugShortcutsSectionProps {
  navigation: NativeStackNavigationProp<RootStackParamList>;
}

export const DebugShortcutsSection: React.FC<DebugShortcutsSectionProps> = ({
  navigation,
}) => {
  return (
    <ParameterSection
      icon={<BugIcon />}
      title="Debug Shortcuts"
      description="Jump directly to any screen for testing"
    >
      <YStack gap="$2">
        <Button
          style={{ backgroundColor: 'white' }}
          borderColor={slate200}
          borderRadius="$2"
          height="$5"
          padding={0}
          onPress={() => {
            navigation.navigate('DevPrivateKey');
          }}
        >
          <XStack
            width="100%"
            justifyContent="space-between"
            paddingVertical="$3"
            paddingLeft="$4"
            paddingRight="$1.5"
          >
            <Text fontSize="$5" color={slate500} fontFamily={dinot}>
              View Private Key
            </Text>
            <ChevronRight color={slate500} strokeWidth={2.5} />
          </XStack>
        </Button>
        {IS_DEV_MODE && (
          <Button
            style={{ backgroundColor: 'white' }}
            borderColor={slate200}
            borderRadius="$2"
            height="$5"
            padding={0}
            onPress={() => {
              navigation.navigate('Home', { testReferralFlow: true });
            }}
          >
            <XStack
              width="100%"
              justifyContent="space-between"
              paddingVertical="$3"
              paddingLeft="$4"
              paddingRight="$1.5"
            >
              <Text fontSize="$5" color={slate500} fontFamily={dinot}>
                Test Referral Flow
              </Text>
              <ChevronRight color={slate500} strokeWidth={2.5} />
            </XStack>
          </Button>
        )}
        <ScreenSelector />
      </YStack>
    </ParameterSection>
  );
};
