// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Linking, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image, XStack, YStack } from 'tamagui';
import { Download } from '@tamagui/lucide-icons';

import { trackBranchEvent, useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { BodyText, Button, Title } from '@selfxyz/mobile-sdk-alpha/components';
import { AadhaarEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  black,
  slate100,
  slate200,
  slate700,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import {
  aadhaarAndroidPlayStoreUrl,
  aadhaarIosAppStoreUrl,
} from '@/consts/links';
import { buttonTap } from '@/integrations/haptics';
import { extraYPadding } from '@/utils/styleUtils';

interface AadhaarInstructionScreenProps {
  screen: 'download' | 'select_version';
  mockupImage: ImageSourcePropType;
  headerText: string;
  bodyText: string;
  secondaryLabel: string;
  secondaryIcon?: React.ReactNode;
  onSecondaryPress: () => void;
  secondaryDisabled?: boolean;
}

const AadhaarInstructionScreen: React.FC<AadhaarInstructionScreenProps> = ({
  screen,
  mockupImage,
  headerText,
  bodyText,
  secondaryLabel,
  secondaryIcon,
  onSecondaryPress,
  secondaryDisabled = false,
}) => {
  const insets = useSafeAreaInsets();
  const selfClient = useSelfClient();

  // Points the user to the respective store for the Aadhaar app. When the app
  // is already installed the store shows "Open" instead of "Install".
  const handleInstall = () => {
    buttonTap();
    trackBranchEvent(selfClient, AadhaarEvents.APP_INSTALL_PRESSED, { screen });
    Linking.openURL(
      Platform.OS === 'ios'
        ? aadhaarIosAppStoreUrl
        : aadhaarAndroidPlayStoreUrl,
    );
  };

  return (
    <YStack flex={1} backgroundColor={slate100}>
      <YStack
        flex={1}
        backgroundColor={white}
        borderTopLeftRadius={14}
        borderTopRightRadius={14}
        overflow="hidden"
        justifyContent="flex-end"
      >
        <Image
          source={mockupImage}
          position="absolute"
          top={30}
          left={0}
          right={0}
          width="100%"
          height={479}
          alignSelf="center"
          objectFit="contain"
        />
        <LinearGradient
          colors={['rgba(255,255,255,0)', white]}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 280,
          }}
          pointerEvents="none"
        />

        <YStack padding={20}>
          <YStack
            backgroundColor="rgba(0,0,0,0.4)"
            borderRadius={14}
            padding={24}
            gap={12}
          >
            <Title style={{ color: white, letterSpacing: 1 }}>
              {headerText}
            </Title>
            <BodyText style={{ fontSize: 18, color: white }}>
              {bodyText}
            </BodyText>
          </YStack>
        </YStack>
      </YStack>

      <YStack
        backgroundColor={white}
        borderTopWidth={1}
        borderTopColor={slate200}
        paddingTop={20}
        paddingHorizontal={20}
        paddingBottom={insets.bottom + extraYPadding}
      >
        <XStack gap={12} alignItems="center">
          <Button
            unstyled
            flex={1}
            height={45}
            justifyContent="center"
            backgroundColor={black}
            borderWidth={1}
            borderColor={slate700}
            borderRadius={60}
            paddingHorizontal={14}
            scaleSpace={1.25}
            onPress={handleInstall}
            icon={<Download size={20} color={white} />}
          >
            <BodyText style={{ fontSize: 16, color: white }}>Install</BodyText>
          </Button>

          <Button
            unstyled
            flex={1}
            height={45}
            justifyContent="center"
            backgroundColor={white}
            borderWidth={1}
            borderColor={slate200}
            borderRadius={60}
            paddingHorizontal={14}
            scaleSpace={1.25}
            opacity={secondaryDisabled ? 0.5 : 1}
            disabled={secondaryDisabled}
            onPress={onSecondaryPress}
            icon={secondaryIcon}
          >
            <BodyText style={{ fontSize: 16, color: black }}>
              {secondaryLabel}
            </BodyText>
          </Button>
        </XStack>
      </YStack>
    </YStack>
  );
};

export default AadhaarInstructionScreen;
