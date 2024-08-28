import React from 'react';
import { ScrollView, Text, YStack } from 'tamagui';
import useNavigationStore from '../stores/navigationStore';
import { XStack } from 'tamagui';
import CustomButton from '../components/CustomButton';
import { BadgeCheck, Binary, List, QrCode, Smartphone } from '@tamagui/lucide-icons';
import { bgGreen, textBlack } from '../utils/colors';
import useUserStore from '../stores/userStore';
import { Platform } from 'react-native';
import { NativeModules } from 'react-native';
import { AppType } from '../../../sdk/src';
import { reconstructAppType } from '../../../common/src/utils/appType';

interface AppScreenProps {
  setSheetAppListOpen: (value: boolean) => void;
  setSheetRegisterIsOpen: (value: boolean) => void;
}

const AppScreen: React.FC<AppScreenProps> = ({ setSheetAppListOpen, setSheetRegisterIsOpen }) => {
  const {
    setSelectedApp,
    setSelectedTab,
    toast
  } = useNavigationStore();

  const {
    registered,
  } = useUserStore();

  const scanQRCode = () => {
    if (Platform.OS === 'ios') {
      if (NativeModules.QRScannerBridge && NativeModules.QRScannerBridge.scanQRCode) {
        NativeModules.QRScannerBridge.scanQRCode()
          .then((result: string) => {
            handleQRCodeScan(result);
          })
          .catch((error: any) => {
            console.error('QR Scanner Error:', error);
            toast.show('Error', {
              message: 'Failed to scan QR code',
              type: 'error',
            });
          });
      } else {
        console.error('QR Scanner module not found for iOS');
        toast.show('Error', {
          message: 'QR Scanner not available',
          type: 'error',
        });
      }
    } else if (Platform.OS === 'android') {
      if (NativeModules.QRCodeScanner && NativeModules.QRCodeScanner.scanQRCode) {
        NativeModules.QRCodeScanner.scanQRCode()
          .then((result: string) => {
            handleQRCodeScan(result);
          })
          .catch((error: any) => {
            console.error('QR Scanner Error:', error);
            toast.show('Error', {
              message: 'Failed to scan QR code',
              type: 'error',
            });
          });
      } else {
        console.error('QR Scanner module not found for Android');
        toast.show('Error', {
          message: 'QR Scanner not available',
          type: 'error',
        });
      }
    }
  };

  const handleQRCodeScan = (result: string) => {
    try {
      console.log(result);
      const parsedJson = JSON.parse(result);
      const app: AppType = reconstructAppType(parsedJson);
      setSelectedApp(app);
      setSelectedTab("prove");
      toast.show('✅', {
        message: "QR code scanned",
        customData: {
          type: "success",
        },
      })
    } catch (error) {
      console.error('Error parsing QR code result:', error);
      toast.show('Error', {
        message: "QR code parsing failed",
        customData: {
          type: "error",
        },
      })
    }
  };

  return (
    <YStack f={1} pb="$3" px="$3">
      <XStack ml="$2" gap="$2" ai="center">
        {registered ?
          <XStack bg={bgGreen} px="$2.5" py="$2" borderRadius="$10">
            <Text color={textBlack} fontSize="$4">scanned</Text>
          </XStack> :
          <XStack bg={'#FFB897'} px="$2.5" py="$2" borderRadius="$10">
            <Text color={textBlack} fontSize="$4">not scanned</Text>
          </XStack>}

      </XStack>
      <ScrollView showsVerticalScrollIndicator={true} indicatorStyle="black">
        <YStack >

          {/* <XStack ml="$2" gap="$2" mt="$1">
            <Text fontSize="$5">userID:</Text>
            <Text color={textBlack} fontSize="$5">0x1234567890</Text>
          </XStack> */}
        </YStack>
        <YStack>
          <Text mt="$4" fontSize="$8" >How to use OpenPassport?</Text>
          <YStack>
            <XStack mt="$3" px="$5" gap="$2" >
              <QrCode size={50} color={textBlack} />
              <YStack>
                <Text fontSize="$5" mb="$1">Scan QR code</Text>
                <XStack gap="$2"><Text fontSize="$3">1</Text><Text fontSize="$3" maxWidth={220}>Find the QR code on the page of the app that asks for OpenPassport.</Text></XStack>
                <XStack mt="$1" gap="$2"><Text fontSize="$3">2</Text><Text fontSize="$3" maxWidth={220}>Scan the QR code.</Text></XStack>
              </YStack>
            </XStack>
            <XStack mt="$4" px="$5" gap="$2" >
              <BadgeCheck size={50} color={textBlack} />
              <YStack>
                <Text fontSize="$5" mb="$1">Generate a Proof</Text>
                <XStack gap="$2"><Text fontSize="$3">1</Text><Text fontSize="$3" maxWidth={220}>Generate a proof of the selected information.</Text></XStack>
                <XStack mt="$1" gap="$2"><Text fontSize="$3">2</Text><Text fontSize="$3" maxWidth={220}>Share the proof with the application.</Text></XStack>
              </YStack>
            </XStack>
          </YStack>
        </YStack>
        <YStack mb="$4">
          <Text mt="$5" fontSize="$8" >How does it works?</Text>
          <YStack>
            <XStack mt="$3" px="$5" gap="$2" >
              <Binary size={50} color={textBlack} />
              <YStack>
                <Text fontSize="$5" mb="$1">Strong cryptography</Text>
                <XStack gap="$2"><Text fontSize="$3">·</Text><Text fontSize="$3" maxWidth={220}>OpenPassport uses ZK technologies which allows you to prove a statement without revealing why it's true.</Text></XStack>
                <XStack gap="$2"><Text fontSize="$3">·</Text><Text fontSize="$3" maxWidth={220}>You are always anonymous</Text></XStack>
              </YStack>
            </XStack>
            <XStack mt="$3" px="$5" gap="$2" >
              <Smartphone size={50} color={textBlack} />
              <YStack>
                <Text fontSize="$5" mb="$1">Serverless</Text>
                <XStack gap="$2"><Text fontSize="$3">·</Text><Text fontSize="$3" maxWidth={220}>OpenPassport will never receive your data and will never know who you are.</Text></XStack>
                <XStack gap="$2"><Text fontSize="$3">·</Text><Text fontSize="$3" maxWidth={220}>Everything is achieved on your device, even the camera and NFC scanning.</Text></XStack>

              </YStack>
            </XStack>
          </YStack>
        </YStack>
      </ScrollView>


      <XStack f={1} minHeight="$1" />

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