// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
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
import { useKycLauncher } from '@/hooks/useKycLauncher';
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
  const paddingBottom = useSafeBottomPadding(extraYPadding + 35);
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

  const { launchKycVerification, isLoading: isRetrying } = useKycLauncher({
    countryCode,
    errorSource: 'nfc_scan_failed',
    onCancel: () => {
      navigation.goBack();
    },
    onError: (_error, _result) => {
      // Stay on this screen - user can try again
      // Error is already logged in the hook
    },
  });

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
    await launchKycVerification();
  }, [launchKycVerification, trackEvent]);

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
          paddingBottom={10}
          alignItems="center"
          justifyContent="space-between"
        >
          <NavBar.LeftAction
            component="close"
            color={black}
            onPress={handleClose}
          />
          <NavBar.Title style={styles.navTitle}>{headerTitle}</NavBar.Title>
          <Button unstyled onPress={handleHelp} aria-label="Help" hitSlop={8}>
            <YStack
              width={26}
              height={26}
              borderRadius={13}
              backgroundColor={blue600}
              alignItems="center"
              justifyContent="center"
            >
              <BodyText style={styles.helpButtonText}>?</BodyText>
            </YStack>
          </Button>
        </NavBar.Container>

        {/* Progress Bar - Step 3 for NFC */}
        <YStack paddingHorizontal={40} paddingBottom={14} paddingTop={4}>
          <XStack gap={3} height={6}>
            {[1, 2, 3, 4].map(step => (
              <YStack
                key={step}
                flex={1}
                backgroundColor={step === 3 ? cyan300 : slate300}
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
            <BodyText style={styles.errorTitle}>
              There was a problem reading the chip
            </BodyText>
            <BodyText style={styles.errorSubtitle}>
              Make sure NFC is enabled and try again
            </BodyText>
          </YStack>

          <Button
            backgroundColor={black}
            borderRadius={100}
            height={52}
            pressStyle={{ opacity: 0.8 }}
            onPress={handleRetryOriginal}
            disabled={isRetrying}
          >
            <BodyText style={styles.primaryButtonText}>
              Try reading again
            </BodyText>
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
        <Button
          backgroundColor={white}
          borderWidth={1}
          borderColor={slate200}
          borderRadius={100}
          height={52}
          pressStyle={{ opacity: 0.8 }}
          onPress={() =>
            navigation.navigate('DataConfirmation', { fromNfcFailure: true })
          }
        >
          <BodyText style={styles.buttonText}>Check scanned data</BodyText>
        </Button>

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
          <BodyText style={styles.buttonText}>
            {isRetrying ? 'Loading...' : 'Try a different method'}
          </BodyText>
        </Button>

        {/* Footer Text - Not italic */}
        <BodyText style={styles.footerText}>
          Registering with alternative methods may take longer to verify your
          document.
        </BodyText>
      </YStack>
    </YStack>
  );
};

const styles = StyleSheet.create({
  navTitle: {
    fontFamily: dinot,
    fontSize: 17,
  },
  helpButtonText: {
    color: white,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
    textAlign: 'center',
    includeFontPadding: false,
  },
  errorTitle: {
    fontSize: 18,
    textAlign: 'center',
    color: black,
  },
  errorSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: slate500,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '500',
    fontFamily: dinot,
    color: black,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '500',
    fontFamily: dinot,
    color: white,
  },
  footerText: {
    fontSize: 16,
    textAlign: 'center',
    color: slate500,
  },
});

export default RegistrationFallbackNFCScreen;
