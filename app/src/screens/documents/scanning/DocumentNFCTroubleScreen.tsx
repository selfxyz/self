// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { YStack } from 'tamagui';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { Caption, SecondaryButton } from '@selfxyz/mobile-sdk-alpha/components';
import { slate500, slate700 } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import type { TipProps } from '@/components/Tips';
import Tips from '@/components/Tips';
import { useFeedbackAutoHide } from '@/hooks/useFeedbackAutoHide';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import { useSumsubLauncher } from '@/hooks/useSumsubLauncher';
import SimpleScrolledTitleLayout from '@/layouts/SimpleScrolledTitleLayout';
import { flushAllAnalytics } from '@/services/analytics';
import { openSupportForm, SUPPORT_FORM_BUTTON_TEXT } from '@/services/support';
import { useSettingStore } from '@/stores/settingStore';

const tips: TipProps[] = [
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
    title: 'Fill the Frame',
    body: 'Make sure the entire ID page is within the camera view, with all edges visible.',
  },
  {
    title: 'Hold Steady & Wait',
    body: "Once you sense the phone's reader engaging with the chip, hold the device still for a few seconds to complete the verification process.",
  },
  {
    title: 'Try Different Angles',
    body: "If the first attempt fails, slowly adjust the angle or position of your phone over the passport—every device's NFC reader can be positioned slightly differently.",
  },
];

const DocumentNFCTroubleScreen: React.FC = () => {
  const go = useHapticNavigation('DocumentNFCScan', { action: 'cancel' });
  const goToNFCMethodSelection = useHapticNavigation(
    'DocumentNFCMethodSelection',
  );
  const selfClient = useSelfClient();
  const { useMRZStore } = selfClient;
  const { countryCode } = useMRZStore();
  const kycEnabled = useSettingStore(state => state.kycEnabled);
  const { launchSumsubVerification, isLoading } = useSumsubLauncher({
    countryCode,
    errorSource: 'sumsub_initialization',
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
      onDismiss={go}
      secondaryButtonText="Open NFC Options"
      onSecondaryButtonPress={goToNFCMethodSelection}
      footer={
        <YStack gap="$3">
          <SecondaryButton
            onPress={openSupportForm}
            textColor={slate700}
            style={{ marginBottom: 0 }}
          >
            {SUPPORT_FORM_BUTTON_TEXT}
          </SecondaryButton>

          {kycEnabled && (
            <SecondaryButton
              onPress={launchSumsubVerification}
              disabled={isLoading}
              textColor={slate700}
              style={{ marginBottom: 0 }}
            >
              {isLoading ? 'Loading...' : 'Try Alternative Verification'}
            </SecondaryButton>
          )}
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
      </YStack>
    </SimpleScrolledTitleLayout>
  );
};

export default DocumentNFCTroubleScreen;
