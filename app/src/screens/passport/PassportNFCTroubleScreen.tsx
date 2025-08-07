// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React, { useEffect } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { YStack } from 'tamagui';

import type { TipProps } from '../../components/Tips';
import Tips from '../../components/Tips';
import { Caption } from '../../components/typography/Caption';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import SimpleScrolledTitleLayout from '../../layouts/SimpleScrolledTitleLayout';
import analytics from '../../utils/analytics';
import { slate500 } from '../../utils/colors';

const { flush: flushAnalytics } = analytics();

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

const PassportNFCTrouble: React.FC = () => {
  const go = useHapticNavigation('PassportNFCScan', { action: 'cancel' });
  const goToNFCMethodSelection = useHapticNavigation(
    'PassportNFCMethodSelection',
  );

  // error screen, flush analytics
  useEffect(() => {
    flushAnalytics();
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
    >
      <YStack
        paddingTop={24}
        paddingHorizontal={10}
        paddingBottom={32}
        gap={20}
      >
        <GestureDetector gesture={devModeTap}>
          <Caption size="large" color={slate500}>
            Here are some tips to help you successfully scan the RFID chip:
          </Caption>
        </GestureDetector>
        <Tips items={tips} />
        <Caption size="large" color={slate500}>
          These steps should help improve the success rate of reading the RFID
          chip in your passport. If the issue persists, double-check that your
          device supports NFC and that your passport's RFID is functioning
          properly.
        </Caption>
      </YStack>
    </SimpleScrolledTitleLayout>
  );
};

export default PassportNFCTrouble;
