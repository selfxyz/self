import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNavigation } from '@react-navigation/native';
import { Button, YStack, styled } from 'tamagui';

import { BodyText } from '../components/typography/BodyText';
import { Caption } from '../components/typography/Caption';
import ScanIcon from '../images/icons/qr_scan.svg';
import WarnIcon from '../images/icons/warning.svg';
import SelfIdCard from '../images/self-id-card.svg';
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
  const navigation = useNavigation();
  return (
    <SafeAreaView style={{ backgroundColor: black, flex: 1 }}>
      <YStack
        bg={black}
        gap={20}
        jc="space-between"
        height={'100%'}
        padding={20}
      >
        <YStack ai="center" gap={20} justifyContent="flex-start">
          <SelfIdCard width="100%" />
          <Caption color={amber500} opacity={0.3} textTransform="uppercase">
            Only visible to you
          </Caption>
          <PrivacyNote />
        </YStack>
        <YStack ai="center" gap={20} justifyContent="center" paddingBottom={20}>
          <ScanButton onPress={() => navigation.navigate('QRCodeViewFinder')}>
            <ScanIcon color={amber500} />
          </ScanButton>
          <Caption color={amber500} textTransform="uppercase">
            Prove your SELF ID
          </Caption>
        </YStack>
      </YStack>
    </SafeAreaView>
  );
};

function PrivacyNote() {
  const { hasPrivacyNoteBeenDismissed } = useSettingStore();
  const navigation = useNavigation();

  if (hasPrivacyNoteBeenDismissed) {
    return null;
  }

  return (
    <Card onPressIn={() => navigation.navigate('Disclaimer')}>
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
