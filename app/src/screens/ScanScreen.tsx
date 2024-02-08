import React from 'react';
import { YStack, Text, Spinner, Circle, ZStack, XStack } from 'tamagui'; // Ensure correct import paths based on your project setup
import { Steps } from '../utils/utils';

interface ScanScreenProps {
  onStartCameraScan: () => void;
  nfcScan: () => void;
  step: number;
}

const ScanScreen: React.FC<ScanScreenProps> = ({ onStartCameraScan, nfcScan, step }) => {
  return (
    <YStack f={1} p="$5" gap="$1" px="$5" pt="$12">
      <ZStack alignSelf='center' maxWidth={50} maxHeight={50} width={50} flex={0} >
        <Circle
          alignSelf='center'
          h={22}
          w={22}
          borderWidth={1.6}
          p={0}
        />
        <Text
          alignSelf='center'
          h={22}
          w={22}
          y={1}
          x={7}
          color="black"
          fow="bold"
        >1</Text>
      </ZStack>
      <Text textAlign='center' mt="$5" fow={step === Steps.MRZ_SCAN ? "bold" : "normal"} >Scan the machine readable zone on the main page of your passport</Text>
      <ZStack alignSelf='center' mt="$5" maxWidth={50} maxHeight={50} width={50} flex={0} >
        <Circle
          alignSelf='center'
          h={22}
          w={22}
          borderWidth={1.6}
          p={0}
        />
        <Text
          alignSelf='center'
          h={22}
          w={22}
          y={1}
          x={7}
          color="black"
          fow="bold"
        >2</Text>
      </ZStack>
      <Text textAlign='center' mt="$5" fow={(step === Steps.MRZ_SCAN_COMPLETED) || (step === Steps.NFC_SCANNING) ? "bold" : "normal"}>Hold your passport against your device to read the biometric chip</Text>

      <ZStack alignSelf='center' mt="$5" maxWidth={50} maxHeight={50} width={50} flex={0} >
        <Circle
          alignSelf='center'
          h={22}
          w={22}
          borderWidth={1.6}
          p={0}
        />
        <Text
          alignSelf='center'
          h={22}
          w={22}
          y={1}
          x={7}
          color="black"
          fow="bold"
        >3</Text>
      </ZStack>
      <Text textAlign='center' mt="$5" fow={step >= Steps.NFC_SCAN_COMPLETED ? "bold" : "normal"}>Select App</Text>

      <YStack ai="center">
        {
          step < Steps.NFC_SCAN_COMPLETED
            ? (
              step < Steps.MRZ_SCAN_COMPLETED
                ?
                <YStack mt="$10">
                  <Text onPress={onStartCameraScan} size="$4" br="$2" color="#3185FC">Open camera</Text>
                  <Spinner mt="$4" color={step === Steps.NFC_SCANNING ? "#3185FC" : "transparent"} />

                </YStack>
                : (
                  <YStack mt="$10">
                    <Text size="$4" br="$2" color="#3185FC" onPress={nfcScan}>
                      {step === Steps.NFC_SCANNING ? "Scanning" : "Scan passport with NFC"}
                    </Text>
                    <Spinner mt="$4" color={step === Steps.NFC_SCANNING ? "#3185FC" : "transparent"} />
                  </YStack>
                )
            )
            : <XStack />
        }
      </YStack>

    </YStack>
  );
};

export default ScanScreen;
