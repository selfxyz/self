import React from 'react';
import { YStack, Text, XStack } from 'tamagui';
import { bgGreen, textBlack } from '../utils/colors';


const SuccessScreen: React.FC = () => {
  return (
    <YStack f={1} p="$3">
      <YStack f={1} mt="$8">
        <Text ml="$1" fontSize="$10" color={textBlack}><Text style={{ textDecorationLine: 'underline', textDecorationColor: bgGreen }}>Success</Text>, the proof has been verified</Text>
        <XStack f={1} />
      </YStack>


    </YStack>
  );
};

export default SuccessScreen;