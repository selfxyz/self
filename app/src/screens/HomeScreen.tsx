import React from 'react';

import { Image, Text, View, YStack } from 'tamagui';

import MAP from '../images/map.png';
import { black, textBlack } from '../utils/colors';

const HomeScreen: React.FC = () => {
  return (
    <YStack f={1} px="$4" bg={black}>
      <YStack f={1} mt="$6" mb="$2.5" gap="$0" ai="center" jc="space-between">
        <View>
          <Image src={MAP} />
        </View>
        <Text textAlign="center" fontSize="$4" color={textBlack}>
          No personal information will be shared without your explicit consent.
        </Text>
      </YStack>
    </YStack>
  );
};

export default HomeScreen;
