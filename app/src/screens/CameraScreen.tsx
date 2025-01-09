import React from 'react';

import { Camera, SquarePen } from '@tamagui/lucide-icons';
import { Image, Text, YStack } from 'tamagui';

import CustomButton from '../components/CustomButton';
import PASSPORT_DRAWING from '../images/passport_drawing.png';
import { startCameraScan } from '../utils/cameraScanner';
import { bgGreen, textBlack } from '../utils/colors';

interface CameraScreenProps {
  setSheetIsOpen: (value: boolean) => void;
}

const CameraScreen: React.FC<CameraScreenProps> = ({ setSheetIsOpen }) => {
  return (
    <YStack f={1}>
      <YStack f={1} my="$6" jc="space-evenly" ai="center">
        <Text textAlign="center" fontSize="$9" color={textBlack}>
          <Text
            style={{
              textDecorationLine: 'underline',
              textDecorationColor: bgGreen,
            }}
          >
            Scan
          </Text>{' '}
          or type your passport ID
        </Text>
        <Text textAlign="center" mt="$4" fontSize="$6" color={textBlack}>
          Open your passport on the{' '}
          <Text
            style={{
              textDecorationLine: 'underline',
              textDecorationColor: bgGreen,
            }}
          >
            main page
          </Text>{' '}
          to scan it.
        </Text>
        <Image src={PASSPORT_DRAWING} style={{ width: 200, height: 250 }} />
      </YStack>
      <Text textAlign="center" mb="$2" fontSize="$4" color={textBlack}>
        The application is not taking a picture, only reading some fields.
      </Text>
      <YStack gap="$2.5">
        <CustomButton
          text="Open Camera"
          onPress={startCameraScan}
          Icon={<Camera color={textBlack} size={24} />}
        />
        <CustomButton
          bgColor="#ffff"
          text="Manual Input"
          onPress={() => setSheetIsOpen(true)}
          Icon={<SquarePen color={textBlack} size={24} />}
        />
      </YStack>
    </YStack>
  );
};

export default CameraScreen;
