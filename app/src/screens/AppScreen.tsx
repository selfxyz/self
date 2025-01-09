import React from 'react';

import { QrCode } from '@tamagui/lucide-icons';
import { Image, Text, XStack, YStack } from 'tamagui';

import CustomButton from '../components/CustomButton';
import OPENPASSPORT_LOGO from '../images/openpassport.png';
import useUserStore from '../stores/userStore';
import { textBlack } from '../utils/colors';
import { scanQRCode } from '../utils/qrCode';

interface AppScreenProps {
  setSheetAppListOpen: (value: boolean) => void;
  setSheetRegisterIsOpen: (value: boolean) => void;
}

const AppScreen: React.FC<AppScreenProps> = ({ setSheetRegisterIsOpen }) => {
  const { registered } = useUserStore();

  return (
    <YStack f={1}>
      <XStack f={1} minHeight="$1" />

      <Image
        alignSelf="center"
        src={OPENPASSPORT_LOGO}
        width={400}
        height={150}
      />
      <Text
        mt="$2.5"
        textAlign="center"
        fontSize="$9"
        fontWeight="bold"
        color={textBlack}
      >
        OpenPassport
      </Text>

      <XStack f={1} minHeight="$1" />
      <Text textAlign="center" mb="$2" fontSize="$3" color={textBlack}>
        To use OpenPassport, scan the QR code displayed by an app.
      </Text>
      <YStack gap="$2.5">
        <CustomButton
          text="Scan QR Code"
          onPress={() => {
            if (registered) {
              scanQRCode();
            } else {
              setSheetRegisterIsOpen(true);
            }
          }}
          Icon={<QrCode size={18} color={textBlack} />}
        />
      </YStack>
    </YStack>
  );
};

export default AppScreen;
