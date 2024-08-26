import React from 'react';
import { YStack, Button, Image, Text, ScrollView, XStack, Separator } from 'tamagui';
import { Camera, ShieldCheck, SquarePen, VenetianMask, X } from '@tamagui/lucide-icons';
import { bgColor, bgGreen, blueColor, borderColor, componentBgColor, componentBgColor2, separatorColor, textBlack, textColor1, textColor2 } from '../utils/colors';
import SCANHelp from '../images/scan_help.png'
import { startCameraScan } from '../utils/cameraScanner';
import CustomButton from '../components/CustomButton';
import useUserStore from '../stores/userStore';
import useNavigationStore from '../stores/navigationStore';
import { mockPassportData_sha256_rsa_65537 } from '../../../common/src/constants/mockPassportData';
import { Steps } from '../utils/utils';
interface CameraScreenProps {
  sheetIsOpen: boolean
  setSheetIsOpen: (value: boolean) => void
}

const CameraScreen: React.FC<CameraScreenProps> = ({ sheetIsOpen, setSheetIsOpen }) => {
  const {
    showWarningModal,
    update: updateNavigationStore,
    step,
    setStep,
    selectedTab,
    setSelectedTab,
    hideData,
    toast,
    showRegistrationErrorSheet,
    registrationErrorMessage,
    nfcSheetIsOpen,
    setNfcSheetIsOpen,
  } = useNavigationStore();

  const {
    passportNumber,
    dateOfBirth,
    dateOfExpiry,
    deleteMrzFields,
    update,
    clearPassportDataFromStorage,
    clearSecretFromStorage,
    clearProofsFromStorage,
    passportData,
    registered,
    setRegistered,
    cscaProof,
    localProof,
  } = useUserStore()
  const handleSkip = () => {
    // update({
    //   passportData: mockPassportData_sha256_rsa_65537
    // })
    setSelectedTab("mock");
    // deleteMrzFields();
    // toast.show("Using mock passport data!", { type: "info" })
  }
  return (
    <YStack f={1} p="$3">
      <YStack f={1} mt="$16">
        <Text ml="$1" fontSize={34} color={textBlack}><Text style={{ textDecorationLine: 'underline', textDecorationColor: bgGreen }}>Scan</Text> or type your passport ID</Text>
        <Text ml="$2" mt="$8" fontSize="$8" color={textBlack}>Open your passport on the <Text style={{ textDecorationLine: 'underline', textDecorationColor: bgGreen }}>main page</Text> to scan it.</Text>
        <Text ml="$2" mt="$2" fontSize="$8" color={textBlack} style={{ opacity: 0.7 }}>Your data never leaves your device.</Text>
        <XStack f={1} />

        {/* <XStack justifyContent='center' alignItems='center' gap="$1.5">
          <ShieldCheck color={textBlack} size={14} />
          <Text color={textBlack} fontSize="$4">private and secured</Text>
        </XStack> */}
      </YStack>
      {/* <Image borderRadius="$5"
          w="full"
          h="$13"
          source={{ uri: SCANHelp }}
        /> */}
      <XStack p="$3" onPress={handleSkip} ai="center" jc="center">
        <Text mt="$5" fontSize="$3" alignSelf='center' w="80%" ai="center" textAlign="center" color={textBlack}>
          You can also <Text color={blueColor} style={{ textDecorationLine: 'underline', textDecorationColor: blueColor }}>use mock passport data</Text> and skip this step.
        </Text>
      </XStack>

      <YStack gap="$2.5"  >
        <CustomButton text="Open Camera" onPress={startCameraScan} Icon={<Camera color={textBlack} size={24} />} />
        <CustomButton bgColor='#ffff' text="Manual Input" onPress={() => setSheetIsOpen(true)} Icon={<SquarePen color={textBlack} size={24} />} />
      </YStack>

    </YStack>
  );
};

export default CameraScreen;