import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePreventRemove } from '@react-navigation/native';
import { Button, YStack, styled } from 'tamagui';

import { BodyText } from '../components/typography/BodyText';
import { Caption } from '../components/typography/Caption';
import useHapticNavigation from '../hooks/useHapticNavigation';
import ScanIcon from '../images/icons/qr_scan.svg';
import WarnIcon from '../images/icons/warning.svg';
import SelfCard from '../images/self-card.svg';
import { useSettingStore } from '../stores/settingStore';
import { amber500, black, neutral700, slate800, white } from '../utils/colors';

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

const HomeScreen: React.FC = () => {
  const onCaptionPress = useHapticNavigation('Launch');
  const onScanButtonPress = useHapticNavigation('QRCodeViewFinder');
  // Prevents back navigation
  usePreventRemove(true, () => {});
  const { bottom } = useSafeAreaInsets();
  return (
    <YStack
      bg={black}
      gap={20}
      jc="space-around"
      flex={1}
      paddingHorizontal={20}
      paddingBottom={bottom + 20}
    >
      <YStack ai="center" gap={20} justifyContent="flex-start">
        <SelfCard width="100%" />
        <Caption
          color={amber500}
          opacity={0.3}
          textTransform="uppercase"
          onPress={onCaptionPress}
        >
          Only visible to you
        </Caption>
        <PrivacyNote />
      </YStack>
      <YStack
        ai="center"
        gap={20}
        justifyContent="center"
        paddingBottom={20}
        hitSlop={50}
      >
        <ScanButton onPress={onScanButtonPress}>
          <ScanIcon color={amber500} />
        </ScanButton>
        <Caption
          color={amber500}
          textTransform="uppercase"
          onPress={onScanButtonPress}
        >
          Prove your SELF
        </Caption>
      </YStack>
    </YStack>
  );
};

function PrivacyNote() {
  const { hasPrivacyNoteBeenDismissed } = useSettingStore();
  const onDisclaimerPress = useHapticNavigation('Disclaimer');

  if (hasPrivacyNoteBeenDismissed) {
    return null;
  }

  return (
    <Card onPressIn={onDisclaimerPress}>
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
  borderRadius: 4,
  gap: 12,
  alignItems: 'center',
  padding: 20,
});
