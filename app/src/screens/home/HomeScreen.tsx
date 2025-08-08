// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React, { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, styled, YStack } from 'tamagui';

import {
  useFocusEffect,
  useNavigation,
  usePreventRemove,
} from '@react-navigation/native';
import { pressedStyle } from '@src/components/buttons/pressedStyle';
import { BodyText } from '@src/components/typography/BodyText';
import { Caption } from '@src/components/typography/Caption';
import { ProofEvents } from '@src/consts/analytics';
import { useAppUpdates } from '@src/hooks/useAppUpdates';
import useConnectionModal from '@src/hooks/useConnectionModal';
import useHapticNavigation from '@src/hooks/useHapticNavigation';
import SelfCard from '@src/images/card-style-1.svg';
import ScanIcon from '@src/images/icons/qr_scan.svg';
import WarnIcon from '@src/images/icons/warning.svg';
import { usePassport } from '@src/providers/passportDataProvider';
import { useSettingStore } from '@src/stores/settingStore';
import analytics from '@src/utils/analytics';
import {
  amber500,
  black,
  neutral700,
  slate800,
  white,
} from '@src/utils/colors';
import { extraYPadding } from '@src/utils/constants';

const ScanButton = styled(Button, {
  borderRadius: 20,
  width: 90,
  height: 90,
  borderColor: neutral700,
  borderWidth: 1,
  backgroundColor: '#1D1D1D',
  alignItems: 'center',
  justifyContent: 'center',
});

const { trackEvent } = analytics();

const HomeScreen: React.FC = () => {
  useConnectionModal();
  const navigation = useNavigation();
  const { getAllDocuments } = usePassport();
  const [isNewVersionAvailable, showAppUpdateModal, isModalDismissed] =
    useAppUpdates();

  useFocusEffect(() => {
    if (isNewVersionAvailable && !isModalDismissed) {
      showAppUpdateModal();
    }
  });

  useFocusEffect(
    useCallback(() => {
      async function checkDocs() {
        try {
          const docs = await getAllDocuments();
          if (Object.keys(docs).length === 0) {
            navigation.navigate('Launch' as never);
          }
        } catch {
          // ignore errors
        }
      }

      checkDocs();
    }, [getAllDocuments, navigation]),
  );

  const goToQRCodeViewFinder = useHapticNavigation('QRCodeViewFinder');
  const onScanButtonPress = useCallback(() => {
    trackEvent(ProofEvents.QR_SCAN_REQUESTED, {
      from: 'Home',
    });

    goToQRCodeViewFinder();
  }, [goToQRCodeViewFinder]);

  // Prevents back navigation
  usePreventRemove(true, () => {});
  const { bottom } = useSafeAreaInsets();
  return (
    <YStack
      backgroundColor={black}
      gap={20}
      justifyContent="space-between"
      flex={1}
      paddingHorizontal={20}
      paddingBottom={bottom + extraYPadding}
    >
      <YStack alignItems="center" gap={20} justifyContent="flex-start">
        <SelfCard width="100%" />
        <Caption color={amber500} opacity={0.3} textTransform="uppercase">
          Only visible to you
        </Caption>
        <PrivacyNote />
      </YStack>
      <YStack alignItems="center" gap={20} justifyContent="flex-end">
        <ScanButton
          onPress={onScanButtonPress}
          hitSlop={100}
          pressStyle={pressStyle}
        >
          <ScanIcon color={amber500} />
        </ScanButton>
        <Caption
          onPress={onScanButtonPress}
          color={amber500}
          textTransform="uppercase"
          backgroundColor={black}
          pressStyle={{ backgroundColor: 'transparent' }}
        >
          Prove your SELF
        </Caption>
      </YStack>
    </YStack>
  );
};

const pressStyle = {
  opacity: 1,
  backgroundColor: 'transparent',
  transform: [{ scale: 0.95 }],
} as const;

function PrivacyNote() {
  const { hasPrivacyNoteBeenDismissed } = useSettingStore();
  const onDisclaimerPress = useHapticNavigation('Disclaimer');

  if (hasPrivacyNoteBeenDismissed) {
    return null;
  }

  return (
    <Card onPress={onDisclaimerPress} pressStyle={pressedStyle}>
      <WarnIcon color={white} width={24} height={33} />
      <BodyText color={white} textAlign="center" fontSize={18}>
        A note on protecting your privacy
      </BodyText>
    </Card>
  );
}

export default HomeScreen;

const Card = styled(YStack, {
  width: '100%',

  flexGrow: 0,
  backgroundColor: slate800,
  borderRadius: 8,
  gap: 12,
  alignItems: 'center',
  padding: 20,
});
