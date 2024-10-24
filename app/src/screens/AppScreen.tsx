import React from 'react';
import { ScrollView, Text, YStack, Image } from 'tamagui';
import { XStack } from 'tamagui';
import CustomButton from '../components/CustomButton';
import { BadgeCheck, Binary, List, QrCode, Smartphone } from '@tamagui/lucide-icons';
import { bgGreen, textBlack } from '../utils/colors';
import useUserStore from '../stores/userStore';
import { scanQRCode } from '../utils/qrCode';
import OPENPASSPORT_LOGO from '../images/openpassport.png';

interface AppScreenProps {
  setSheetAppListOpen: (value: boolean) => void;
  setSheetRegisterIsOpen: (value: boolean) => void;
}

const AppScreen: React.FC<AppScreenProps> = ({ setSheetAppListOpen, setSheetRegisterIsOpen }) => {
  const {
    registered,
  } = useUserStore();



  return (
    <YStack f={1} >
      <XStack f={1} minHeight="$1" />

      <Image alignSelf='center' src={OPENPASSPORT_LOGO} width={400} height={150} />
      <Text mt="$2.5" textAlign='center' fontSize="$9" fontWeight='bold' color={textBlack}>OpenPassport</Text>

      <XStack f={1} minHeight="$1" />
      <Text textAlign='center' mb="$2" fontSize="$3" color={textBlack}>To use OpenPassport, scan the QR code displayed by an app.</Text>
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
}

export default AppScreen;