import React, { useCallback, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavigation } from '@react-navigation/native';
import { ChevronDown, Minus, Plus, X } from '@tamagui/lucide-icons';
import { flag } from 'country-emoji';
import getCountryISO2 from 'country-iso-3-to-2';
import {
  Button,
  ScrollView,
  Separator,
  Sheet,
  Spinner,
  Switch,
  Text,
  XStack,
  YStack,
} from 'tamagui';

import { countryCodes } from '../../../common/src/constants/constants';
import { genMockPassportData } from '../../../common/src/utils/passports/genMockPassportData';
import { initPassportDataParsing } from '../../../common/src/utils/passports/passport';
import ButtonsContainer from '../components/ButtonsContainer';
import { PrimaryButton } from '../components/buttons/PrimaryButton';
import { SecondaryButton } from '../components/buttons/SecondaryButton';
import { BodyText } from '../components/typography/BodyText';
import { Title } from '../components/typography/Title';
import { storePassportData } from '../stores/passportDataProvider';
import { borderColor, separatorColor, textBlack, white } from '../utils/colors';
import { buttonTap, selectionChange } from '../utils/haptic';

interface MockDataScreenProps {}

const MockDataScreen: React.FC<MockDataScreenProps> = ({}) => {
  const navigation = useNavigation();
  const [age, setAge] = useState(24);
  const [expiryYears, setExpiryYears] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInOfacList, setIsInOfacList] = useState(false);
  const castDate = (yearsOffset: number) => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + yearsOffset);
    return (
      date.toISOString().slice(2, 4) +
      date.toISOString().slice(5, 7) +
      date.toISOString().slice(8, 10)
    ).toString();
  };
  const [selectedCountry, setSelectedCountry] = useState('USA');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(
    'sha256 rsa 65537 2048',
  );
  const [isCountrySheetOpen, setCountrySheetOpen] = useState(false);
  const [isAlgorithmSheetOpen, setAlgorithmSheetOpen] = useState(false);

  const handleCountrySelect = (countryCode: string) => {
    setSelectedCountry(countryCode);
    setCountrySheetOpen(false);
  };

  const handleAlgorithmSelect = (algorithm: string) => {
    setSelectedAlgorithm(algorithm);
    setAlgorithmSheetOpen(false);
  };

  const signatureAlgorithmToStrictSignatureAlgorithm = {
    'sha256 rsa 65537 4096': ['sha256', 'sha256', 'rsa_sha256_65537_4096'],
    'sha1 rsa 65537 2048': ['sha1', 'sha1', 'rsa_sha1_65537_2048'],
    // 'sha256 rsapss 65537 2048': ['sha256', 'sha256', 'rsapss_sha256_65537_2048'], // DSC was signed by a CSCA we don't need to support anymore, TODO sign it with another CSCA
    'sha256 brainpoolP256r1': [
      'sha256',
      'sha256',
      'ecdsa_sha256_brainpoolP256r1_256',
    ],
    'sha384 brainpoolP384r1': [
      'sha384',
      'sha384',
      'ecdsa_sha384_brainpoolP384r1_384',
    ],
    'sha384 secp384r1': ['sha384', 'sha384', 'ecdsa_sha384_secp384r1_384'],
    'sha256 rsa 65537 2048': ['sha256', 'sha256', 'rsa_sha256_65537_2048'],
    'sha256 rsa 3 2048': ['sha256', 'sha256', 'rsa_sha256_3_2048'],
    'sha256 rsa 65537 3072': ['sha256', 'sha256', 'rsa_sha256_65537_3072'],
    'sha256 rsa 3 4096': ['sha256', 'sha256', 'rsa_sha256_3_4096'],
    'sha384 rsa 65537 4096': ['sha384', 'sha384', 'rsa_sha384_65537_4096'],
    'sha512 rsa 65537 2048': ['sha512', 'sha512', 'rsa_sha512_65537_2048'],
    'sha512 rsa 65537 4096': ['sha512', 'sha512', 'rsa_sha512_65537_4096'],
    'sha1 rsa 65537 4096': ['sha1', 'sha1', 'rsa_sha1_65537_4096'],
    'sha256 rsapss 3 2048': ['sha256', 'sha256', 'rsapss_sha256_3_2048'],
    'sha256 rsapss 3 3072': ['sha256', 'sha256', 'rsapss_sha256_3_3072'],
    'sha256 rsapss 65537 3072': [
      'sha256',
      'sha256',
      'rsapss_sha256_65537_3072',
    ],
    'sha256 rsapss 65537 4096': [
      'sha256',
      'sha256',
      'rsapss_sha256_65537_4096',
    ],
    'sha384 rsapss 65537 2048': [
      'sha384',
      'sha384',
      'rsapss_sha384_65537_2048',
    ],
    'sha384 rsapss 65537 3072': [
      'sha384',
      'sha384',
      'rsapss_sha384_65537_3072',
    ],
    'sha512 rsapss 65537 2048': [
      'sha512',
      'sha512',
      'rsapss_sha512_65537_2048',
    ],
    'sha512 rsapss 65537 4096': [
      'sha512',
      'sha512',
      'rsapss_sha512_65537_4096',
    ],
    'sha1 secp256r1': ['sha1', 'sha1', 'ecdsa_sha1_secp256r1_256'],
    'sha224 secp224r1': ['sha224', 'sha224', 'ecdsa_sha224_secp224r1_224'],
    'sha256 secp256r1': ['sha256', 'sha256', 'ecdsa_sha256_secp256r1_256'],
    'sha256 secp384r1': ['sha256', 'sha256', 'ecdsa_sha256_secp384r1_384'],
    'sha1 brainpoolP224r1': ['sha1', 'sha1', 'ecdsa_sha1_brainpoolP224r1_224'],
    'sha1 brainpoolP256r1': ['sha1', 'sha1', 'ecdsa_sha1_brainpoolP256r1_256'],
    'sha224 brainpoolP224r1': [
      'sha224',
      'sha224',
      'ecdsa_sha224_brainpoolP224r1_224',
    ],
    'sha256 brainpoolP224r1': [
      'sha256',
      'sha256',
      'ecdsa_sha256_brainpoolP224r1_224',
    ],
    'sha384 brainpoolP256r1': [
      'sha384',
      'sha384',
      'ecdsa_sha384_brainpoolP256r1_256',
    ],
    'sha512 brainpoolP256r1': [
      'sha512',
      'sha512',
      'ecdsa_sha512_brainpoolP256r1_256',
    ],
    'sha512 brainpoolP384r1': [
      'sha512',
      'sha512',
      'ecdsa_sha512_brainpoolP384r1_384',
    ],
  } as const;

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    const randomPassportNumber = Math.random()
      .toString(36)
      .substring(2, 11)
      .replace(/[^a-z0-9]/gi, '')
      .toUpperCase();
    await new Promise(resolve =>
      setTimeout(async () => {
        let mockPassportData;
        const [hashFunction1, hashFunction2, signatureAlgorithm] =
          signatureAlgorithmToStrictSignatureAlgorithm[
            selectedAlgorithm as keyof typeof signatureAlgorithmToStrictSignatureAlgorithm
          ];

        if (isInOfacList) {
          mockPassportData = genMockPassportData(
            hashFunction1,
            hashFunction2,
            signatureAlgorithm,
            selectedCountry as keyof typeof countryCodes,
            // We disregard the age to stick with Arcangel's birth date
            '541007',
            castDate(expiryYears),
            randomPassportNumber,
            'HENAO MONTOYA', // this name is on the OFAC list
            'ARCANGEL DE JESUS',
          );
        } else {
          mockPassportData = genMockPassportData(
            hashFunction1,
            hashFunction2,
            signatureAlgorithm,
            selectedCountry as keyof typeof countryCodes,
            castDate(-age),
            castDate(expiryYears),
            randomPassportNumber,
          );
        }
        mockPassportData = initPassportDataParsing(mockPassportData);
        await storePassportData(mockPassportData);
        resolve(null);
      }, 0),
    );

    await new Promise(resolve => setTimeout(resolve, 1000));
    navigation.navigate('ConfirmBelongingScreen', {
      mockPassportFlow: true,
    });
  }, [selectedAlgorithm, selectedCountry, age, expiryYears, isInOfacList]);

  const { top, bottom } = useSafeAreaInsets();
  return (
    <YStack f={1} bg={white} pt={top} pb={bottom}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack px="$4" pb="$4" gap="$5">
          <YStack ai="center" mb={'$10'}>
            <Title>Generate Passport Data</Title>
            <BodyText textAlign="center">
              Configure the passport data parameters below
            </BodyText>
          </YStack>

          <XStack ai="center" jc="space-between">
            <BodyText>Encryption</BodyText>
            <Button
              onPress={() => {
                buttonTap();
                setAlgorithmSheetOpen(true);
              }}
              p="$2"
              px="$3"
              bg="white"
              borderColor={borderColor}
              borderWidth={1}
              borderRadius="$4"
            >
              <XStack ai="center" gap="$2">
                <Text fontSize="$4">{selectedAlgorithm}</Text>
                <ChevronDown size={20} />
              </XStack>
            </Button>
          </XStack>

          <XStack ai="center" jc="space-between">
            <BodyText>Nationality</BodyText>
            <Button
              onPress={() => {
                buttonTap();
                setCountrySheetOpen(true);
              }}
              p="$2"
              px="$3"
              bg="white"
              borderColor={borderColor}
              borderWidth={1}
              borderRadius="$4"
            >
              <XStack ai="center" gap="$2">
                <Text fontSize="$4">
                  {countryCodes[selectedCountry as keyof typeof countryCodes]}{' '}
                  {flag(getCountryISO2(selectedCountry))}
                </Text>
                <ChevronDown size={20} />
              </XStack>
            </Button>
          </XStack>

          <XStack ai="center" jc="space-between">
            <BodyText>Age (🎂)</BodyText>
            <XStack ai="center" gap="$2">
              <Button
                h="$3.5"
                w="$3.5"
                bg="white"
                jc="center"
                borderColor={borderColor}
                borderWidth={1}
                borderRadius="$10"
                onPress={() => {
                  buttonTap();
                  setAge(age - 1);
                }}
                disabled={age <= 0 || isInOfacList}
              >
                <Minus />
              </Button>
              <Text textAlign="center" w="$6" color={textBlack} fontSize="$5">
                {isInOfacList ? 71 : age} yo
              </Text>
              <Button
                h="$3.5"
                w="$3.5"
                bg="white"
                jc="center"
                borderColor={borderColor}
                borderWidth={1}
                borderRadius="$10"
                onPress={() => {
                  buttonTap();
                  setAge(age + 1);
                }}
                disabled={isInOfacList}
              >
                <Plus />
              </Button>
            </XStack>
          </XStack>

          <XStack ai="center" jc="space-between">
            <BodyText>Passport expires in</BodyText>
            <XStack ai="center" gap="$2">
              <Button
                h="$3.5"
                w="$3.5"
                bg="white"
                jc="center"
                borderColor={borderColor}
                borderWidth={1}
                borderRadius="$10"
                onPress={() => {
                  buttonTap();
                  setExpiryYears(expiryYears - 1);
                }}
                disabled={expiryYears <= 0}
              >
                <Minus />
              </Button>
              <Text textAlign="center" w="$6" color={textBlack} fontSize="$5">
                {expiryYears} years
              </Text>
              <Button
                h="$3.5"
                w="$3.5"
                bg="white"
                jc="center"
                borderColor={borderColor}
                borderWidth={1}
                borderRadius="$10"
                onPress={() => {
                  buttonTap();
                  setExpiryYears(expiryYears + 1);
                }}
              >
                <Plus />
              </Button>
            </XStack>
          </XStack>

          <XStack ai="center" jc="space-between">
            <BodyText>In OFAC list</BodyText>
            <Switch
              size="$3.5"
              checked={isInOfacList}
              onCheckedChange={() => {
                buttonTap();
                setIsInOfacList(!isInOfacList);
              }}
              bg={isInOfacList ? '$green7Light' : '$gray4'}
            >
              <Switch.Thumb animation="quick" bc="white" />
            </Switch>
          </XStack>

          {isInOfacList && (
            <Text color="$red10" fontSize="$3">
              OFAC list is a list of people who are suspected of being involved
              in terrorism or other illegal activities.
            </Text>
          )}
        </YStack>
      </ScrollView>

      <YStack px="$4" pb="$4">
        <ButtonsContainer>
          <PrimaryButton onPress={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <Spinner color="gray" size="small" />
            ) : (
              'Generate Passport Data'
            )}
          </PrimaryButton>
          <SecondaryButton onPress={() => navigation.goBack()}>
            Cancel
          </SecondaryButton>
        </ButtonsContainer>
      </YStack>

      <Sheet
        modal
        open={isCountrySheetOpen}
        onOpenChange={setCountrySheetOpen}
        snapPoints={[60]}
        animation="medium"
        disableDrag
      >
        <Sheet.Overlay />
        <Sheet.Frame
          bg={white}
          borderTopLeftRadius="$9"
          borderTopRightRadius="$9"
        >
          <YStack p="$4">
            <XStack ai="center" jc="space-between" mb="$4">
              <Text fontSize="$8">Select a country</Text>
              <XStack
                onPress={() => {
                  selectionChange();
                  setCountrySheetOpen(false);
                }}
                p="$2"
              >
                <X color={borderColor} size="$1.5" mr="$2" />
              </XStack>
            </XStack>
            <Separator borderColor={separatorColor} mb="$4" />
            <ScrollView showsVerticalScrollIndicator={false}>
              {Object.keys(countryCodes).map(countryCode => (
                <TouchableOpacity
                  key={countryCode}
                  onPress={() => {
                    buttonTap();
                    handleCountrySelect(countryCode);
                    setCountrySheetOpen(false);
                  }}
                >
                  <XStack py="$3" px="$2">
                    <Text fontSize="$4">
                      {countryCodes[countryCode as keyof typeof countryCodes]}{' '}
                      {flag(getCountryISO2(countryCode))}
                    </Text>
                  </XStack>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </YStack>
        </Sheet.Frame>
      </Sheet>

      <Sheet
        modal
        open={isAlgorithmSheetOpen}
        onOpenChange={setAlgorithmSheetOpen}
        snapPoints={[70]}
        animation="medium"
        disableDrag
      >
        <Sheet.Overlay />
        <Sheet.Frame
          bg={white}
          borderTopLeftRadius="$9"
          borderTopRightRadius="$9"
        >
          <YStack p="$4">
            <XStack ai="center" jc="space-between" mb="$4">
              <Text fontSize="$8">Select an algorithm</Text>
              <XStack
                onPress={() => {
                  selectionChange();
                  setAlgorithmSheetOpen(false);
                }}
                p="$2"
              >
                <X color={borderColor} size="$1.5" mr="$2" />
              </XStack>
            </XStack>
            <Separator borderColor={separatorColor} mb="$4" />
            <ScrollView showsVerticalScrollIndicator={false}>
              <YStack pb="$10">
                {Object.keys(signatureAlgorithmToStrictSignatureAlgorithm).map(
                  algorithm => (
                    <TouchableOpacity
                      key={algorithm}
                      onPress={() => {
                        buttonTap();
                        handleAlgorithmSelect(algorithm);
                        setAlgorithmSheetOpen(false);
                      }}
                    >
                      <XStack py="$3" px="$2">
                        <Text fontSize="$4">{algorithm}</Text>
                      </XStack>
                    </TouchableOpacity>
                  ),
                )}
              </YStack>
            </ScrollView>
          </YStack>
        </Sheet.Frame>
      </Sheet>
    </YStack>
  );
};

export default MockDataScreen;
