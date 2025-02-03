import React from 'react';

import { Button, Image, styled, View, YStack } from 'tamagui';

import MAP from '../images/map.png';
import ScanIcon from '../images/icons/qr_scan.svg';

import { black, amber500, neutral700 } from '../utils/colors';
import { Caption } from '../components/typography/Caption';
import { useNavigation } from '@react-navigation/native';

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
  const {navigate} = useNavigation();
  return (
    <YStack f={1} px="$4" bg={black}>
      <YStack f={1} mt="$6" mb="$10" gap="$0" ai="center" jc="space-between">
        <View ai="center" gap="$4">
          <Image src={MAP} />
          <Caption color={amber500} opacity={0.3} textTransform="uppercase">
            Only visible to you
          </Caption>
        </View>
        <View ai="center" gap="$3.5">
          <ScanButton onPress={() => navigate('ProveScreen')}>  
            <ScanIcon color={amber500} />
          </ScanButton>
          <Caption color={amber500} textTransform="uppercase">
            Prove your SELF ID
          </Caption>
        </View>
      </YStack>
    </YStack>
  );
};

export default HomeScreen;
