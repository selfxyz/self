import React from 'react';

import { ArrowRight } from '@tamagui/lucide-icons';
import { Image, Text, YStack } from 'tamagui';

import CustomButton from '../components/CustomButton';
import OPENPASSPORT_LOGO from '../images/openpassport.png';
import useNavigationStore from '../stores/navigationStore';
import { textBlack } from '../utils/colors';

const StartScreen: React.FC = () => {
  const { setSelectedTab } = useNavigationStore();

  return (
    <YStack f={1}>
      <YStack f={1} mt="$6" mb="$2.5" gap="$0" ai="center" jc="space-between">
        <Text fontSize={38} color={textBlack} textAlign="center">
          Welcome to OpenPassport.
        </Text>
        <Image src={OPENPASSPORT_LOGO} width={400} height={300} />
        <Text textAlign="center" fontSize="$4" color={textBlack}>
          No personal information will be shared without your explicit consent.
        </Text>
      </YStack>

      <YStack gap="$2.5">
        <CustomButton
          Icon={<ArrowRight />}
          text="Use my passport"
          onPress={() => {
            setSelectedTab('scan');
          }}
        />
        <CustomButton
          bgColor="white"
          Icon={<ArrowRight />}
          text="Use a mock passport"
          onPress={() => {
            setSelectedTab('mock');
          }}
        />
      </YStack>
    </YStack>
  );
};

export default StartScreen;
