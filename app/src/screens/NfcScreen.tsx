import React from 'react';
import { YStack, Text, XStack, Button, Image, ScrollView } from 'tamagui';
import { Steps } from '../utils/utils';
import { Camera, ExternalLink, Nfc, X, SquarePen } from '@tamagui/lucide-icons';
import { blueColorDark, blueColorLight, borderColor, componentBgColor2, greenColorDark, greenColorLight, redColorDark, redColorLight, textColor1, textColor2 } from '../utils/colors';
import { useToastController } from '@tamagui/toast'
import NFCHelp from '../images/nfc_help.png'
import SCANHelp from '../images/scan_help.png'
import { Linking } from 'react-native';
import { startCameraScan } from '../utils/cameraScanner';

interface NfcScreenProps {
  handleNFCScan: () => void;
}


const NfcScreen: React.FC<NfcScreenProps> = ({ handleNFCScan }) => {
  return (
    <YStack f={1} p="$3">

      <Image borderRadius="$5" alignSelf='center'
        w="$12"
        h="$14"
        source={{ uri: NFCHelp }}
      />

      <YStack f={1} gap="$2">


        <YStack mt="$2">
          <Text fontSize="$7" fow="bold" mt="$1" color={textColor1}>Scan the NFC chip in your passport.</Text>
          <Text fontSize="$6" color={textColor1} mt="$2">How do I find and scan the NFC chip?</Text>
          <YStack ml="$3" gap="$2" mt="$1" >
            <XStack gap="$1">
              <Text fontSize="$4" color={textColor2}>1.</Text>
              <Text fontSize="$4" color={textColor2}>Close your passport and hold the middle of the back cover of your passport to the top of the phoneThe passport should touch the phone.</Text>
            </XStack>
            <XStack gap="$1">
              <Text fontSize="$4" color={textColor2}>2.</Text>
              <Text fontSize="$4" color={textColor2}>If that does not work, try using the front cover of your passport.</Text>
            </XStack>
            <XStack gap="$1">
              <Text fontSize="$4" color={textColor2}>3.</Text>
              <Text fontSize="$4" color={textColor2}>Move your phone slowly up and down until scanning starts.</Text>
            </XStack>
            <XStack gap="$1">
              <Text fontSize="$4" color={textColor2}>4.</Text>
              <Text fontSize="$4" color={textColor2}>Hold your device still when scanning starts.</Text>
            </XStack>
          </YStack>

        </YStack>

      </YStack>

      <YStack gap="$2">
        <Button borderWidth={1.3} borderColor={borderColor} borderRadius="$10" bg="#3185FC" onPress={handleNFCScan}><Nfc color={textColor1} /></Button>
      </YStack>




    </YStack >
  );
};

export default NfcScreen;
