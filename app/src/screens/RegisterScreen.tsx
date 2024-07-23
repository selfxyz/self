import React, { useState } from 'react';
import { YStack, XStack, Text, Button, Spinner } from 'tamagui';
import { LockKeyhole, UserPlus } from '@tamagui/lucide-icons';
import { bgGreen, borderColor, componentBgColor, componentBgColor2, textBlack } from '../utils/colors';
import { Platform } from 'react-native';
import useUserStore from '../stores/userStore';
import useNavigationStore from '../stores/navigationStore';
import CustomButton from '../components/CustomButton';

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
        <Text mt="$12" color={textBlack} fontSize="$10" fontWeight="bold">
          Register
        </Text>
        <Text mt="$7" fontSize="$7" color={textBlack}>Join Proof of Passport to start sharing your identity<Text fontSize="$7" style={{
          textDecorationLine: "underline", textDecorationColor: bgGreen
        }}> securely. </Text></Text>
        <Text mt="$0" fontSize="$6" color={textBlack} style={{
          opacity: 0.7
        }}>Easily verify your nationality, humanity, or age and share<Text style={{
          textDecorationLine: "underline", textDecorationColor: bgGreen
        }}> only </Text>what you want to reveal.</Text>
        <XStack f={1} />

        <XStack mt="$5" bg="white" borderRadius={100} mb="$12" py="$2" px="$3">
          <XStack p="$2" >
            <LockKeyhole alignSelf='center' size={24} color={textBlack} />
          </XStack>
          <Text alignSelf='center' ml="$3" pr="$5" fontSize="$3" color={textBlack}>Registration does not leak any personal information</Text>
        </XStack>

        <CustomButton
          isDisabled={isZkeyDownloading.register_sha256WithRSAEncryption_65537 || registering}
          onPress={handleRegister}
          text={isZkeyDownloading.register_sha256WithRSAEncryption_65537 ? "Downloading zkey..." : (registerStep || "Register")}
          Icon={isZkeyDownloading.register_sha256WithRSAEncryption_65537 || registering ? <Spinner color={textBlack} /> : <UserPlus color={textBlack} />}
        />
        {/* <Button
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
            <Text color={textBlack} fontSize="$5" >
              {isZkeyDownloading.register_sha256WithRSAEncryption_65537 ? "Downloading zkey..." : (registerStep || "Register")}
            </Text>
          </XStack>
        </Button> */}
      </YStack >
    </YStack >
  );
};

export default RegisterScreen;