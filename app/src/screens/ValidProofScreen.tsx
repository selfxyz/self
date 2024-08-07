import React from 'react';
import { YStack, Button, Image, Text, ScrollView, XStack, Separator } from 'tamagui';
import { Camera, ShieldCheck, SquarePen, X } from '@tamagui/lucide-icons';
import { bgColor, bgGreen, borderColor, componentBgColor, componentBgColor2, separatorColor, textBlack, textColor1, textColor2 } from '../utils/colors';
import SCANHelp from '../images/scan_help.png'
import { startCameraScan } from '../utils/cameraScanner';
import CustomButton from '../components/CustomButton';


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