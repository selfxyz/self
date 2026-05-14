// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Button, XStack, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { Caption, SecondaryButton } from '@selfxyz/mobile-sdk-alpha/components';
import {
  blue600,
  slate500,
  slate700,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import SupportUuidRow from '@/components/support/SupportUuidRow';
import type { TipProps } from '@/components/Tips';
import Tips from '@/components/Tips';
import { useFeedbackAutoHide } from '@/hooks/useFeedbackAutoHide';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import { useKycLauncher } from '@/hooks/useKycLauncher';
import { selectionChange } from '@/integrations/haptics';
import SimpleScrolledTitleLayout from '@/layouts/SimpleScrolledTitleLayout';
import { flushAllAnalytics } from '@/services/analytics';

const tips: TipProps[] = [
  {
    title: 'Lay Your Passport Flat',
    body: "Open your passport and lay it flat on a stable surface. Place your phone on top of the page with the NFC reader over the chip, and keep both items still. If the read doesn't start, slowly slide the phone around the page to locate the chip — but always keep the passport flat and the phone resting on it.",
  },
  {
    title: 'Know Your Chip Location',
    body: "Depending on your passport's country of origin, the RFID chip could be in the front cover, back cover, or a specific page. Move your device slowly around these areas to locate the chip.",
  },
  {
    title: 'Remove Any Obstructions',
    body: 'Some phone cases can interfere with RFID/NFC signals. Consider removing your case or any metal objects near your phone.',
  },
  {
    title: 'Enable NFC',
    body: "Make sure your phone's NFC feature is turned on.",
  },
  {
    title: 'Hold Steady & Wait',
    body: "Once you sense the phone's reader engaging with the chip, hold the device still for a few seconds to complete the verification process.",
  },
];

const DocumentNFCTroubleScreen: React.FC = () => {
  const navigation = useNavigation();
  const handleDismiss = useCallback(() => {
    selectionChange();
    navigation.goBack();
  }, [navigation]);
  const goToNFCMethodSelection = useHapticNavigation(
    'DocumentNFCMethodSelection',
  );
  const handleOpenNFCOptions = useCallback(() => {
    selectionChange();
    goToNFCMethodSelection();
  }, [goToNFCMethodSelection]);
  const selfClient = useSelfClient();
  const { useMRZStore } = selfClient;
  const { countryCode } = useMRZStore();
  const { launchKycVerification, isLoading } = useKycLauncher({
    countryCode,
  });
  useFeedbackAutoHide();

  // error screen, flush analytics
  useEffect(() => {
    flushAllAnalytics();
  }, []);

  // 5-taps with a single finger
  const devModeTap = Gesture.Tap()
    .numberOfTaps(5)
    .onStart(() => {
      goToNFCMethodSelection();
    });

  return (
    <SimpleScrolledTitleLayout
      title="Having trouble verifying your ID?"
      onDismiss={handleDismiss}
      footer={
        <YStack gap="$3">
          <SupportUuidRow />

          <SecondaryButton
            onPress={launchKycVerification}
            disabled={isLoading}
            textColor={slate700}
            style={{ marginBottom: 0 }}
          >
            {isLoading ? 'Loading...' : 'Try Alternative Verification'}
          </SecondaryButton>
        </YStack>
      }
    >
      <YStack
        paddingTop={24}
        paddingHorizontal={10}
        paddingBottom={32}
        gap={20}
      >
        <GestureDetector gesture={devModeTap}>
          <View collapsable={false}>
            <Caption size="large" style={{ color: slate500 }}>
              Here are some tips to help you successfully scan the RFID chip:
            </Caption>
          </View>
        </GestureDetector>
        <Tips items={tips} />
        <Caption size="large" style={{ color: slate500 }}>
          These steps should help improve the success rate of reading the RFID
          chip in your passport. If the issue persists, double-check that your
          device supports NFC and that your passport's RFID is functioning
          properly.
        </Caption>
        <XStack flexWrap="wrap" alignItems="center" gap={4}>
          <Caption size="large" style={{ color: slate500 }}>
            Didn't find what you were looking for?
          </Caption>
          <Button
            unstyled
            onPress={handleOpenNFCOptions}
            aria-label="Open NFC Options"
            hitSlop={8}
          >
            <Caption size="large" style={{ color: blue600 }}>
              Open NFC Options
            </Caption>
          </Button>
        </XStack>
      </YStack>
    </SimpleScrolledTitleLayout>
  );
};

export default DocumentNFCTroubleScreen;
