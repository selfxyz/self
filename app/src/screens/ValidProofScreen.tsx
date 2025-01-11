import React from 'react';

import { QrCode } from '@tamagui/lucide-icons';
import { Text, XStack, YStack } from 'tamagui';

import CustomButton from '../components/CustomButton';
import { bgGreen, textBlack } from '../utils/colors';
import { scanQRCode } from '../utils/qrCode';

const SuccessScreen: React.FC = () => {
  return (
    <YStack f={1}>
      <YStack f={1} mt="$8">
        <Text ml="$1" fontSize="$10" color={textBlack}>
          <Text
            style={{
              textDecorationLine: 'underline',
              textDecorationColor: bgGreen,
            }}
          >
            Success
          </Text>
          , the proof has been verified
        </Text>
        <XStack f={1} />
      </YStack>

      <CustomButton
        Icon={<QrCode size={18} color={textBlack} />}
        text="Scan another QR code"
        onPress={() => {
          scanQRCode();
        }}
      />
    </YStack>
  );
};

export default SuccessScreen;
