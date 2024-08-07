import React from 'react';
import { YStack, Button, Image, Text, ScrollView, XStack, Separator } from 'tamagui';
import { Camera, ShieldCheck, SquarePen, X } from '@tamagui/lucide-icons';
import { bgColor, bgGreen, borderColor, componentBgColor, componentBgColor2, separatorColor, textBlack, textColor1, textColor2 } from '../utils/colors';
import SCANHelp from '../images/scan_help.png'
import { startCameraScan } from '../utils/cameraScanner';
import CustomButton from '../components/CustomButton';

interface CameraScreenProps {
  sheetIsOpen: boolean
  setSheetIsOpen: (value: boolean) => void
}

const CameraScreen: React.FC<CameraScreenProps> = ({ sheetIsOpen, setSheetIsOpen }) => {
  return (
    <YStack f={1} p="$3">
      <YStack f={1} mt="$16">
        <Text ml="$1" fontSize={34} color={textBlack}><Text style={{ textDecorationLine: 'underline', textDecorationColor: bgGreen }}>Scan</Text> or type your passport ID</Text>
        <Text ml="$2" mt="$8" fontSize="$8" color={textBlack}>Open your passport on the <Text style={{ textDecorationLine: 'underline', textDecorationColor: bgGreen }}>main page</Text> to scan it.</Text>
        <Text ml="$2" mt="$2" fontSize="$8" color={textBlack} style={{ opacity: 0.7 }}>Your data never leaves your device.</Text>
        <XStack f={1} />

        <XStack justifyContent='center' alignItems='center' gap="$1.5">
          <ShieldCheck color={textBlack} size={14} />
          <Text color={textBlack} fontSize="$4">private and secured</Text>
        </XStack>
      </YStack>
      {/* <Image borderRadius="$5"
          w="full"
          h="$13"
          source={{ uri: SCANHelp }}
        /> */}

      <YStack gap="$2.5" mt="$5" >
        <CustomButton text="Open Camera" onPress={startCameraScan} Icon={<Camera color={textBlack} size={24} />} />
        <CustomButton bgColor='#ffff' text="Manual Input" onPress={() => setSheetIsOpen(true)} Icon={<SquarePen color={textBlack} size={24} />} />
      </YStack>
    </YStack>
  );
};

export default CameraScreen;