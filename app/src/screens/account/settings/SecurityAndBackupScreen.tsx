// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { PropsWithChildren } from 'react';
import React, { useCallback } from 'react';
import { Platform, View as RNView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SvgProps } from 'react-native-svg';
import { Button, ScrollView, View, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BodyText, pressedStyle } from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  neutral700,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import Cloud from '@/assets/icons/settings_cloud_backup.svg';
import Lock from '@/assets/icons/settings_lock.svg';
import useHasRealDocument from '@/hooks/useHasRealDocument';
import { impactLight } from '@/integrations/haptics';
import { extraYPadding } from '@/utils/styleUtils';

type MinimalRootStackParamList = Record<string, object | undefined>;

interface MenuButtonProps extends PropsWithChildren {
  Icon: React.FC<SvgProps>;
  onPress: () => void;
}

const MenuButton: React.FC<MenuButtonProps> = ({ children, Icon, onPress }) => (
  <Button
    unstyled
    onPress={onPress}
    pressStyle={pressedStyle}
    width="100%"
    flexDirection="row"
    gap={6}
    paddingVertical={20}
    paddingHorizontal={10}
    borderBottomColor={neutral700}
    borderBottomWidth={1}
    hitSlop={4}
  >
    <Icon height={24} width={21} color={white} />
    <BodyText style={{ color: white, fontSize: 18, lineHeight: 23 }}>
      {children}
    </BodyText>
  </Button>
);

const SecurityAndBackupScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MinimalRootStackParamList>>();
  const { bottom } = useSafeAreaInsets();
  const { hasRealDocument } = useHasRealDocument();

  const go = useCallback(
    (route: string) => () => {
      impactLight();
      navigation.navigate(route as never);
    },
    [navigation],
  );

  // Matches prior Settings gating: iOS always shows Cloud backup; Android
  // shows it only when a real (non-mock) document is present. Recovery phrase
  // is shown on both platforms only when a real document is present.
  const showCloudBackup = Platform.OS !== 'android' || hasRealDocument === true;
  const showRecoveryPhrase = hasRealDocument === true;

  return (
    <RNView collapsable={false}>
      <View backgroundColor={white}>
        <YStack
          backgroundColor={black}
          height="100%"
          paddingHorizontal={20}
          paddingBottom={bottom + extraYPadding}
        >
          <ScrollView>
            <YStack alignItems="flex-start" width="100%">
              {showCloudBackup && (
                <MenuButton Icon={Cloud} onPress={go('CloudBackupSettings')}>
                  Cloud backup
                </MenuButton>
              )}
              {showRecoveryPhrase && (
                <MenuButton Icon={Lock} onPress={go('ShowRecoveryPhrase')}>
                  Reveal recovery phrase
                </MenuButton>
              )}
            </YStack>
          </ScrollView>
        </YStack>
      </View>
    </RNView>
  );
};

export default SecurityAndBackupScreen;
