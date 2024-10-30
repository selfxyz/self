import React from 'react';
import { YStack, Text, XStack } from 'tamagui';
import { bgGreen, textBlack } from '../utils/colors';
import CustomButton from '../components/CustomButton';
import { scanQRCode } from '../utils/qrCode';
import { QrCode } from '@tamagui/lucide-icons';


const SuccessScreen: React.FC = () => {
  return (
    <YStack f={1} >
      <YStack f={1} mt="$8">
        <Text ml="$1" fontSize="$10" color={textBlack}><Text style={{ textDecorationLine: 'underline', textDecorationColor: bgGreen }}>Success</Text>, the proof has been verified</Text>
        <XStack f={1} />
      </YStack>

      <CustomButton Icon={<QrCode size={18} color={textBlack} />} text="Scan another QR code" onPress={() => { scanQRCode() }} />

    </YStack>
  );
};

export default SuccessScreen;