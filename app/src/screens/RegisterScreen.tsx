import React, { useState } from 'react';
import { YStack, XStack, Text, Button, Spinner } from 'tamagui';
import { LockKeyhole } from '@tamagui/lucide-icons';
import { borderColor, componentBgColor, componentBgColor2, textColor1, textColor2 } from '../utils/colors';
import { Platform } from 'react-native';
import useUserStore from '../stores/userStore';
import useNavigationStore from '../stores/navigationStore';

const RegisterScreen: React.FC = () => {

  const [registering, setRegistering] = useState(false);
  const [registerStep, setRegisterStep] = useState<string | null>(null);

  const { isZkeyDownloading } = useNavigationStore.getState();

  const handleRegister = async () => {
    setRegistering(true);
    useUserStore.getState().registerCommitment();
    setRegisterStep("Generating witness...");
    setTimeout(() => {
      setRegisterStep("Generating proof...");
      setTimeout(() => {
        setRegisterStep("DSC verification...");
        setTimeout(() => {
          setRegisterStep("Registering...");
        }, 4000);
      }, 4000);
    }, 4000);
  }

  return (
    <YStack px="$4" f={1} mb={Platform.OS === 'ios' ? "$5" : "$0"}>
      <YStack flex={1} mx="$2" gap="$2">
        <Text mt="$12" color={textColor1} fontSize="$10" fontWeight="bold">
          Register
        </Text>
        <Text mt="$6" fontSize="$6" color={textColor1}>Join Proof of Passport to affirm your identity and start sharing securely.</Text>
        <Text mt="$1" fontSize="$4" color={textColor2}>Easily verify your nationality, gender, or age and take control of your personal data.</Text>
        <Text fontSize="$4" color={textColor2}>Share only what you want with the application you wish.</Text>
        <YStack f={1} />

        <XStack mt="$5" bg={componentBgColor} borderRadius={100} borderWidth={1} borderColor={borderColor} py="$2" px="$3">
          <XStack bg={componentBgColor2} borderRadius={100} p="$2" >
            <LockKeyhole alignSelf='center' size={24} color={textColor1} />
          </XStack>
          <Text alignSelf='center' ml="$3" pr="$5" fontSize="$3" color={textColor1}>Registration does not leak any personal information</Text>
        </XStack>

        <Button
          disabled={isZkeyDownloading.register_sha256WithRSAEncryption_65537}
          mt="$8"
          alignSelf='center'
          onPress={handleRegister}
          borderWidth={1.3} borderColor={borderColor} borderRadius="$10" bg={isZkeyDownloading.register_sha256WithRSAEncryption_65537 ? "gray" : "#3185FC"}
          mb="$6"
          w="100%"
        >
          <XStack gap="$3">
            {(registering || isZkeyDownloading.register_sha256WithRSAEncryption_65537) && <Spinner color="white" size="small" />}
            <Text color={textColor1} fontSize="$5" >
              {isZkeyDownloading.register_sha256WithRSAEncryption_65537 ? "Downloading zkey..." : (registerStep || "Register")}
            </Text>
          </XStack>
        </Button>
      </YStack >
    </YStack >
  );
};

export default RegisterScreen;