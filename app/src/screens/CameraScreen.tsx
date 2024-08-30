import React from 'react';
import { YStack, Text, XStack } from 'tamagui';
import { Camera, SquarePen } from '@tamagui/lucide-icons';
import { bgGreen, blueColor, textBlack } from '../utils/colors';
import { startCameraScan } from '../utils/cameraScanner';
import CustomButton from '../components/CustomButton';
import useNavigationStore from '../stores/navigationStore';
interface CameraScreenProps {
  setSheetIsOpen: (value: boolean) => void
}

const CameraScreen: React.FC<CameraScreenProps> = ({ setSheetIsOpen }) => {
  const {
    setSelectedTab,
  } = useNavigationStore();

  return (
    <YStack f={1} p="$3">
      <YStack f={1} mt="$10">
        <Text ml="$1" fontSize={34} color={textBlack}><Text style={{ textDecorationLine: 'underline', textDecorationColor: bgGreen }}>Scan</Text> or type your passport ID</Text>
        <Text ml="$2" mt="$8" fontSize="$8" color={textBlack}>Open your passport on the <Text style={{ textDecorationLine: 'underline', textDecorationColor: bgGreen }}>main page</Text> to scan it.</Text>
        <Text ml="$2" mt="$3" fontSize="$8" color={textBlack} style={{ opacity: 0.7 }}>Your data never leaves your device.</Text>
        <XStack f={1} />
      </YStack>
      <XStack p="$3" onPress={() => setSelectedTab("mock")} ai="center" jc="center">
        <Text mt="$5" fontSize="$3" alignSelf='center' w="80%" ai="center" textAlign="center" color={textBlack}>
          You can also <Text color={blueColor} style={{ textDecorationLine: 'underline', textDecorationColor: blueColor }}>use mock passport data</Text> and skip this step.
        </Text>
      </XStack>

      <YStack gap="$2.5"  >
        <CustomButton text="Open Camera" onPress={startCameraScan} Icon={<Camera color={textBlack} size={24} />} />
        <CustomButton bgColor='#ffff' text="Manual Input" onPress={() => setSheetIsOpen(true)} Icon={<SquarePen color={textBlack} size={24} />} />
      </YStack>

    </YStack>
  );
};

export default CameraScreen;