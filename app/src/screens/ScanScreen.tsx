import React, { useState, useEffect } from 'react';
import { YStack, Text, Spinner, Circle, ZStack, XStack, SizableText } from 'tamagui'; // Ensure correct import paths based on your project setup
import { Steps } from '../utils/utils';
const ScanScreen = ({ onStartCameraScan, nfcScan, step }) => {



  return (
    <YStack >
      <ZStack alignSelf='center' maxWidth={50} maxHeight={50} width={50} flex={1} space="$0">
        <Circle
          alignSelf='center'
          h={22}
          w={22}
          borderWidth={1.6}
          p={0}
        />
        <SizableText
          alignSelf='center'
          h={22}
          w={22}
          y={-1}
          x={7}
          color="black"
          fow="bold"
        >1</SizableText>
      </ZStack>
      <Text textAlign='center' mt="$-3" px="$4" fow={step === Steps.MRZ_SCAN ? "bold" : "normal"} >Scan the machine readable zone on the main page of your passport</Text>


      <ZStack alignSelf='center' mt="$8" maxWidth={50} maxHeight={50} width={50} flex={1} space="$0">
        <Circle
          alignSelf='center'
          h={22}
          w={22}
          borderWidth={1.6}
          p={0}
        />
        <SizableText
          alignSelf='center'
          h={22}
          w={22}
          y={-1}
          x={7}
          color="black"
          fow="bold"
        >2</SizableText>
      </ZStack>
      <Text textAlign='center' mt="$-3" px="$4" fow={(step === Steps.MRZ_SCAN_COMPLETED) || (step === Steps.NFC_SCANNING) ? "bold" : "normal"}>Hold your passport against your device to read the biometric chip</Text>

      <ZStack alignSelf='center' mt="$8" maxWidth={50} maxHeight={50} width={50} flex={1} space="$0">
        <Circle
          alignSelf='center'
          h={22}
          w={22}
          borderWidth={1.6}
          p={0}
        />
        <SizableText
          alignSelf='center'
          h={22}
          w={22}
          y={-1}
          x={7}
          color="black"
          fow="bold"
        >3</SizableText>
      </ZStack>
      <Text textAlign='center' mt="$-3" px="$4" fow={step >= Steps.NFC_SCAN_COMPLETED ? "bold" : "normal"}>Select App</Text>

      <YStack w="100%" ai="center">
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
