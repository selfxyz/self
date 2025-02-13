import { useNavigation } from '@react-navigation/native';
import { ArrowRight } from '@tamagui/lucide-icons';
import React from 'react';
import { Image, Text, YStack } from 'tamagui';

import CustomButton from '../components/CustomButton';
import useHapticNavigation from '../hooks/useHapticNavigation';
import OPENPASSPORT_LOGO from '../images/openpassport.png';
import { textBlack } from '../utils/colors';
import { buttonTap } from '../utils/haptic';

const StartScreen: React.FC = () => {
  const navigation = useNavigation();
  const onPassportOnboardingPress = useHapticNavigation('PassportOnboarding');
  const onMockPassportPress = useHapticNavigation('CreateMock');
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
          onPress={onPassportOnboardingPress}
        />
        {/* TODO Only display this button during dev mode */}
        <CustomButton
          bgColor="white"
          Icon={<ArrowRight />}
          text="Use a mock passport"
          onPress={onMockPassportPress}
        />
        <CustomButton
          text="Cancel"
          bgColor="$gray4"
          onPress={() => {
            buttonTap();
            navigation.goBack();
          }}
        />
      </YStack>
    </YStack>
  );
};

export default StartScreen;
