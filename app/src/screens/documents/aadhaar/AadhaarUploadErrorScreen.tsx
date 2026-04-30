// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, XStack, YStack } from 'tamagui';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from '@tamagui/lucide-icons';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { BodyText } from '@selfxyz/mobile-sdk-alpha/components';
import { AadhaarEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  black,
  cyan300,
  slate100,
  slate200,
  slate300,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';
import { useSafeBottomPadding } from '@selfxyz/mobile-sdk-alpha/hooks';

import WarningIcon from '@/assets/images/warning.svg';
import { NavBar } from '@/components/navbar/BaseNavBar';
import SupportUuidRow from '@/components/support/SupportUuidRow';
import { useKycLauncher } from '@/hooks/useKycLauncher';
import { buttonTap } from '@/integrations/haptics';
import type { RootStackParamList } from '@/navigation';
import { extraYPadding } from '@/utils/styleUtils';

type AadhaarUploadErrorRouteParams = {
  errorType?: 'general' | 'expired';
};

type AadhaarUploadErrorRoute = RouteProp<
  Record<string, AadhaarUploadErrorRouteParams>,
  string
>;

const getErrorMessages = (
  errorType: 'general' | 'expired',
): { title: string; description: string } => {
  switch (errorType) {
    case 'expired':
      return {
        title: 'Your Aadhaar document has expired',
        description: 'Please upload a valid Aadhaar document',
      };
    case 'general':
    default:
      return {
        title: 'There was a problem reading the code',
        description: 'Make sure the QR code is valid and try again',
      };
  }
};

const AadhaarUploadErrorScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const paddingBottom = useSafeBottomPadding(extraYPadding + 35);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<AadhaarUploadErrorRoute>();
  const { trackEvent } = useSelfClient();

  const errorType = route.params?.errorType || 'general';
  const { title, description } = getErrorMessages(errorType);

  const { launchKycVerification, isLoading: isRetrying } = useKycLauncher({
    countryCode: 'IND',
    onCancel: () => {
      navigation.goBack();
    },
    onError: () => {
      // Stay on this screen - user can try again
    },
  });

  const handleClose = useCallback(() => {
    buttonTap();
    navigation.goBack();
  }, [navigation]);

  const handleTryAgain = useCallback(() => {
    trackEvent(AadhaarEvents.RETRY_BUTTON_PRESSED, { errorType });
    navigation.goBack();
  }, [errorType, navigation, trackEvent]);

  const handleTryAlternative = useCallback(async () => {
    trackEvent(AadhaarEvents.HELP_BUTTON_PRESSED, { errorType });
    await launchKycVerification();
  }, [errorType, launchKycVerification, trackEvent]);

  return (
    <YStack flex={1} backgroundColor={slate100}>
      {/* Header */}
      <YStack backgroundColor={slate100}>
        <NavBar.Container
          backgroundColor={slate100}
          barStyle="dark"
          paddingHorizontal="$4"
          paddingTop={insets.top + extraYPadding}
          paddingBottom={10}
          alignItems="center"
          justifyContent="space-between"
        >
          <NavBar.LeftAction
            component="close"
            color={black}
            onPress={handleClose}
          />
          <NavBar.Title style={{ fontFamily: dinot, fontSize: 17 }}>
            AADHAAR REGISTRATION
          </NavBar.Title>
          {/* Invisible spacer to balance header */}
          <YStack width={30} height={30} />
        </NavBar.Container>

        {/* Progress Bar - Step 2 for Aadhaar upload */}
        <YStack paddingHorizontal={40} paddingBottom={14} paddingTop={4}>
          <XStack gap={3} height={6}>
            {[1, 2, 3, 4].map(step => (
              <YStack
                key={step}
                flex={1}
                backgroundColor={step === 2 ? cyan300 : slate300}
                borderRadius={10}
              />
            ))}
          </XStack>
        </YStack>
      </YStack>

      {/* Main Content Area */}
      <YStack
        flex={1}
        backgroundColor={slate100}
        borderBottomWidth={1}
        borderBottomColor={slate200}
      >
        {/* Warning Icon */}
        <YStack flex={1} paddingHorizontal={20} paddingBottom={20}>
          <YStack flex={1} justifyContent="center" alignItems="center">
            <WarningIcon width={150} height={150} />
          </YStack>
        </YStack>

        {/* Error Message and Retry Button */}
        <YStack
          paddingHorizontal={20}
          paddingTop={20}
          paddingBottom={20}
          gap={20}
          borderTopWidth={1}
          borderTopColor={slate200}
        >
          <YStack alignItems="center" gap={4}>
            <BodyText
              style={{ fontSize: 18, textAlign: 'center', color: black }}
            >
              {title}
            </BodyText>
            <BodyText
              style={{
                fontSize: 16,
                textAlign: 'center',
                color: slate500,
              }}
            >
              {description}
            </BodyText>
          </YStack>

          {/* Retry Button - Primary style with icon */}
          <Button
            backgroundColor={black}
            borderRadius={100}
            height={52}
            pressStyle={{ opacity: 0.8 }}
            onPress={handleTryAgain}
            disabled={isRetrying}
          >
            <XStack alignItems="center" gap={8}>
              <Image size={20} color={white} />
              <BodyText
                style={{
                  fontSize: 17,
                  fontWeight: '500',
                  fontFamily: dinot,
                  color: white,
                }}
              >
                Try upload again
              </BodyText>
            </XStack>
          </Button>
        </YStack>
      </YStack>

      {/* Bottom Section */}
      <YStack
        paddingHorizontal={20}
        paddingTop={20}
        paddingBottom={paddingBottom}
        gap={10}
      >
        {/* Secondary Button - White fill, black text, rounded */}
        <Button
          backgroundColor={white}
          borderWidth={1}
          borderColor={slate200}
          borderRadius={100}
          height={52}
          pressStyle={{ opacity: 0.8 }}
          onPress={handleTryAlternative}
          disabled={isRetrying}
        >
          <BodyText
            style={{
              fontSize: 17,
              fontWeight: '500',
              fontFamily: dinot,
              color: black,
            }}
          >
            {isRetrying ? 'Loading...' : 'Try a different method'}
          </BodyText>
        </Button>

        {/* Footer Text - Not italic */}
        <BodyText
          style={{
            fontSize: 16,
            textAlign: 'center',
            color: slate500,
          }}
        >
          Registering with alternative methods may take longer to verify your
          document.
        </BodyText>
        <SupportUuidRow />
      </YStack>
    </YStack>
  );
};

export default AadhaarUploadErrorScreen;
