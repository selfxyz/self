// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, XStack, YStack } from 'tamagui';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { BodyText } from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  blue600,
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
import { useResponsiveScale } from '@/hooks/useResponsiveScale';
import { useSumsubLauncher } from '@/hooks/useSumsubLauncher';
import { buttonTap } from '@/integrations/haptics';
import type { RootStackParamList } from '@/navigation';
import { extraYPadding } from '@/utils/styleUtils';

type RegistrationFallbackNFCRouteParams = {
  countryCode: string;
};

type RegistrationFallbackNFCRoute = RouteProp<
  Record<string, RegistrationFallbackNFCRouteParams>,
  string
>;

const getHeaderTitle = (documentType: string): string => {
  switch (documentType) {
    case 'p':
      return 'PASSPORT REGISTRATION';
    case 'i':
      return 'ID CARD REGISTRATION';
    default:
      return 'DOCUMENT REGISTRATION';
  }
};

const RegistrationFallbackNFCScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const s = useResponsiveScale();
  const paddingBottom = useSafeBottomPadding(extraYPadding + s(35));
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RegistrationFallbackNFCRoute>();
  const selfClient = useSelfClient();
  const { trackEvent, useMRZStore } = selfClient;
  const storeCountryCode = useMRZStore(state => state.countryCode);
  const documentType = useMRZStore(state => state.documentType);

  // Use country code from route params, or fall back to MRZ store
  const countryCode = route.params?.countryCode || storeCountryCode || '';

  const headerTitle = getHeaderTitle(documentType);

  const { launchSumsubVerification, isLoading: isRetrying } = useSumsubLauncher(
    {
      countryCode,
      errorSource: 'nfc_scan_failed',
      onCancel: () => {
        navigation.goBack();
      },
      onError: (_error, _result) => {
        // Stay on this screen - user can try again
        // Error is already logged in the hook
      },
    },
  );

  const handleClose = useCallback(() => {
    buttonTap();
    navigation.goBack();
  }, [navigation]);

  const handleHelp = useCallback(() => {
    buttonTap();
    navigation.navigate('DocumentNFCTrouble');
  }, [navigation]);

  const handleTryAlternative = useCallback(async () => {
    trackEvent('REGISTRATION_FALLBACK_TRY_ALTERNATIVE', {
      errorSource: 'nfc_scan_failed',
    });
    await launchSumsubVerification();
  }, [launchSumsubVerification, trackEvent]);

  const handleRetryOriginal = useCallback(() => {
    trackEvent('REGISTRATION_FALLBACK_RETRY_ORIGINAL', {
      errorSource: 'nfc_scan_failed',
    });
    navigation.navigate('DocumentNFCScan', {});
  }, [navigation, trackEvent]);

  return (
    <YStack flex={1} backgroundColor={slate100}>
      {/* Header */}
      <YStack backgroundColor={slate100}>
        <NavBar.Container
          backgroundColor={slate100}
          barStyle="dark"
          paddingHorizontal="$4"
          paddingTop={insets.top + extraYPadding}
          paddingBottom={s(10)}
          alignItems="center"
          justifyContent="space-between"
        >
          <NavBar.LeftAction
            component="close"
            color={black}
            onPress={handleClose}
          />
          <NavBar.Title style={{ fontFamily: dinot, fontSize: s(17) }}>
            {headerTitle}
          </NavBar.Title>
          <Button
            unstyled
            onPress={handleHelp}
            aria-label="Help"
            hitSlop={s(8)}
          >
            <YStack
              width={s(26)}
              height={s(26)}
              borderRadius={s(13)}
              backgroundColor={blue600}
              alignItems="center"
              justifyContent="center"
            >
              <BodyText
                style={{
                  color: white,
                  fontSize: s(16),
                  fontWeight: '900',
                  lineHeight: s(18),
                  textAlign: 'center',
                  includeFontPadding: false,
                }}
              >
                ?
              </BodyText>
            </YStack>
          </Button>
        </NavBar.Container>

        {/* Progress Bar - Step 3 for NFC */}
        <YStack
          paddingHorizontal={s(40)}
          paddingBottom={s(14)}
          paddingTop={s(4)}
        >
          <XStack gap={s(3)} height={s(6)}>
            {[1, 2, 3, 4].map(step => (
              <YStack
                key={step}
                flex={1}
                backgroundColor={step === 3 ? cyan300 : slate300}
                borderRadius={s(10)}
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
        <YStack flex={1} paddingHorizontal={s(20)} paddingBottom={s(20)}>
          <YStack flex={1} justifyContent="center" alignItems="center">
            <WarningIcon width={s(150)} height={s(150)} />
          </YStack>
        </YStack>

        {/* Error Message and Retry Button */}
        <YStack
          paddingHorizontal={s(20)}
          paddingTop={s(20)}
          paddingBottom={s(20)}
          gap={s(20)}
          borderTopWidth={1}
          borderTopColor={slate200}
        >
          <YStack alignItems="center" gap={s(4)}>
            <BodyText
              style={{ fontSize: s(18), textAlign: 'center', color: black }}
            >
              There was a problem reading the chip
            </BodyText>
            <BodyText
              style={{
                fontSize: s(16),
                textAlign: 'center',
                color: slate500,
              }}
            >
              Make sure NFC is enabled and try again
            </BodyText>
          </YStack>

          {/* Retry Button - Primary style with very rounded corners */}
          <Button
            backgroundColor={black}
            borderRadius={s(100)}
            height={s(52)}
            pressStyle={{ opacity: 0.8 }}
            onPress={handleRetryOriginal}
            disabled={isRetrying}
          >
            <BodyText
              style={{
                fontSize: s(17),
                fontWeight: '500',
                fontFamily: dinot,
                color: white,
              }}
            >
              Try reading again
            </BodyText>
          </Button>
        </YStack>
      </YStack>

      {/* Bottom Section */}
      <YStack
        paddingHorizontal={s(20)}
        paddingTop={s(20)}
        paddingBottom={paddingBottom}
        gap={s(10)}
      >
        {/* Secondary Button - White fill, black text, rounded */}
        <Button
          backgroundColor={white}
          borderWidth={1}
          borderColor={slate200}
          borderRadius={s(100)}
          height={s(52)}
          pressStyle={{ opacity: 0.8 }}
          onPress={handleTryAlternative}
          disabled={isRetrying}
        >
          <BodyText
            style={{
              fontSize: s(17),
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
            fontSize: s(16),
            textAlign: 'center',
            color: slate500,
          }}
        >
          Registering with alternative methods may take longer to verify your
          document.
        </BodyText>
      </YStack>
    </YStack>
  );
};

export default RegistrationFallbackNFCScreen;
