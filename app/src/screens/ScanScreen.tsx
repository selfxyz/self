import React from 'react';
import { YStack, Text, Spinner, XStack } from 'tamagui';
import { Steps } from '../utils/utils';

interface ScanScreenProps {
  onStartCameraScan: () => void;
  handleNFCScan: () => void;
  step: number;
}

const ScanScreen: React.FC<ScanScreenProps> = ({ onStartCameraScan, handleNFCScan, step }) => {

  return (
    <YStack f={1} p="$5" gap="$1" px="$5" justifyContent='center'>
      <XStack
        jc="center"
        borderColor="black"
        borderWidth={2}
        borderRadius="$10"
        f={0}
        w="$1.5"
        h="$1.5"
        alignSelf='center'>
        <Text fontSize="$4" y={0} x={-0.2} alignSelf='center' fow="bold">1</Text>
      </XStack>
      <Text fontSize="$6" textAlign='center' mt="$3" fow={step === Steps.MRZ_SCAN ? "bold" : "normal"} >Scan the machine readable zone on the main page of your passport</Text>

      <XStack
        mt="$10"
        jc="center"
        borderColor="black"
        borderWidth={2}
        borderRadius="$10"
        f={0}
        w="$1.5"
        h="$1.5"
        alignSelf='center'>
        <Text fontSize="$4" y={0} x={-0.2} alignSelf='center' fow="bold">2</Text>
      </XStack>
      <Text fontSize="$6" textAlign='center' mt="$3" fow={(step === Steps.MRZ_SCAN_COMPLETED) || (step === Steps.NFC_SCANNING) ? "bold" : "normal"}>Hold your passport against your device to read the biometric chip</Text>

      <YStack ai="center">
        {
          step < Steps.NFC_SCAN_COMPLETED
            ? (
              step < Steps.MRZ_SCAN_COMPLETED
                ?
                <YStack mt="$6">
                  <Text p="$6" fontSize="$6" onPress={onStartCameraScan} color="#3185FC">Open camera</Text>
                  <Spinner mt="$4" color={step === Steps.NFC_SCANNING ? "#3185FC" : "transparent"} />

                </YStack>
                : (
                  <YStack mt="$6">
                    <Text p="$6" fontSize="$6" color="#3185FC" onPress={handleNFCScan}>
                      {step === Steps.NFC_SCANNING ? "Scanning" : "Scan passport with NFC"}
                    </Text>
                    <Spinner mt="$4" color={step === Steps.NFC_SCANNING ? "#3185FC" : "transparent"} />
                  </YStack>
                )
            )
            :
            <XStack />
        }
      </YStack>
    </YStack >
  );
};

export default ScanScreen;
