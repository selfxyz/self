import { useNavigation } from '@react-navigation/native';
import { countryCodes } from '@selfxyz/common';
import { getSKIPEM } from '@selfxyz/common';
import { genMockIdDoc, IdDocInput } from '@selfxyz/common';
import { initPassportDataParsing } from '@selfxyz/common';
import { ChevronDown, Minus, Plus, X } from '@tamagui/lucide-icons';
import { flag } from 'country-emoji';
import getCountryISO2 from 'country-iso-3-to-2';
import React, { useCallback, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  Input,
  ScrollView,
  Separator,
  Sheet,
  Spinner,
  Switch,
  Text,
  XStack,
  YStack,
} from 'tamagui';

import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import ButtonsContainer from '../../components/ButtonsContainer';
import { BodyText } from '../../components/typography/BodyText';
import { Title } from '../../components/typography/Title';
import { MockDataEvents } from '../../consts/analytics';
import { storePassportData } from '../../providers/passportDataProvider';
import analytics from '../../utils/analytics';
import {
  borderColor,
  separatorColor,
  textBlack,
  white,
} from '../../utils/colors';
import { buttonTap, selectionChange } from '../../utils/haptic';

const { trackEvent } = analytics();

interface MockDataScreenProps {}

const MockDataScreen: React.FC<MockDataScreenProps> = ({}) => {
  const navigation = useNavigation();
  const [birthDate, setBirthDate] = useState('2000/01/01');
  const [expiryYears, setExpiryYears] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInOfacList, setIsInOfacList] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const castDateToYYMMDDForExpiry = (yearsOffset: number) => {
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

  const handleBirthDateChange = (text: string) => {
    if (isInOfacList) return;

    let value = text.replace(/[^0-9]/g, '');
    let formattedValue = '';

    if (value.length > 0) {
      formattedValue += value.substring(0, Math.min(4, value.length));
    }
    if (value.length > 4) {
      formattedValue += '/' + value.substring(4, Math.min(6, value.length));
    }
    if (value.length > 6) {
      formattedValue += '/' + value.substring(6, Math.min(8, value.length));
    }
    setBirthDate(formattedValue);
  };

  const formatBirthDateForGeneration = (inputDate: string): string => {
    if (inputDate && inputDate.length === 10 && inputDate.includes('/')) {
      const parts = inputDate.split('/');
      if (
        parts.length === 3 &&
        parts[0].length === 4 &&
        parts[1].length === 2 &&
        parts[2].length === 2
      ) {
        return `${parts[0].slice(2)}${parts[1]}${parts[2]}`;
      }
    }
    console.warn(
      'Birth date is not in YYYY/MM/DD format for generation. Using default.',
    );
    return '900101';
  };

  const signatureAlgorithmToStrictSignatureAlgorithm = {
    'sha256 rsa 65537 4096': ['sha256', 'sha256', 'rsa_sha256_65537_4096'],
    'sha1 rsa 65537 2048': ['sha1', 'sha1', 'rsa_sha1_65537_2048'],
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
    'sha512 poland': ['sha512', 'sha512', 'rsa_sha256_65537_4096'],
  } as const;

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const randomPassportNumber = Math.random()
        .toString(36)
        .substring(2, 11)
        .replace(/[^a-z0-9]/gi, '')
        .toUpperCase();
      const signatureTypeForGeneration =
        signatureAlgorithmToStrictSignatureAlgorithm[
          selectedAlgorithm as keyof typeof signatureAlgorithmToStrictSignatureAlgorithm
        ][2];

      const idDocInput: Partial<IdDocInput> = {
        nationality: selectedCountry as IdDocInput['nationality'],
        idType: 'mock_passport',
        signatureType:
          signatureTypeForGeneration as IdDocInput['signatureType'],
        expiryDate: castDateToYYMMDDForExpiry(expiryYears),
        passportNumber: randomPassportNumber,
      };

      let dobForGeneration: string;
      if (isInOfacList) {
        dobForGeneration = '541007';
        idDocInput.lastName = 'HENAO MONTOYA';
        idDocInput.firstName = 'ARCANGEL DE JESUS';
      } else {
        if (birthDate.length === 10 && birthDate.split('/').length === 3) {
          dobForGeneration = formatBirthDateForGeneration(birthDate);
        } else {
          setIsGenerating(false);
          return;
        }
      }
      idDocInput.birthDate = dobForGeneration;

      let rawMockData = genMockIdDoc(idDocInput);
      const skiPem = await getSKIPEM('staging');
      let parsedMockData = initPassportDataParsing(rawMockData, skiPem);
      await storePassportData(parsedMockData);

      navigation.navigate('ConfirmBelongingScreen', {});
    } catch (error) {
      console.error('Error during mock data generation:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [
    selectedAlgorithm,
    selectedCountry,
    birthDate,
    expiryYears,
    isInOfacList,
    navigation,
  ]);

  const twoFingerTripleTap = Gesture.Tap()
    .minPointers(2)
    .numberOfTaps(3)
    .onStart(() => {
      setAdvancedMode(true);
      buttonTap();
      trackEvent(MockDataEvents.ENABLE_ADVANCED_MODE);
    });

  const { top, bottom } = useSafeAreaInsets();
  return (
    <YStack f={1} bg={white} pt={top} pb={bottom}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack px="$4" pb="$4" gap="$5">
          <GestureDetector gesture={twoFingerTripleTap}>
            <YStack ai="center" mb={'$10'}>
              <Title>Generate Passport Data</Title>
              <BodyText textAlign="center">
                Configure the passport data parameters below
              </BodyText>
            </YStack>
          </GestureDetector>

          {advancedMode && (
            <XStack ai="center" jc="space-between">
              <BodyText>Encryption</BodyText>
              <Button
                onPress={() => {
                  buttonTap();
                  setAlgorithmSheetOpen(true);
                  trackEvent(MockDataEvents.OPEN_ALGORITHM_SELECTION);
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
          )}

          <XStack ai="center" jc="space-between">
            <BodyText>Nationality</BodyText>
            <Button
              onPress={() => {
                buttonTap();
                setCountrySheetOpen(true);
                trackEvent(MockDataEvents.OPEN_COUNTRY_SELECTION);
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
            <BodyText>Birth Date (YYYY/MM/DD)</BodyText>
            <Input
              placeholder="YYYY/MM/DD"
              value={isInOfacList ? '1954/10/07' : birthDate}
              onChangeText={handleBirthDateChange}
              keyboardType="numeric"
              maxLength={10}
              width={150}
              textAlign="center"
              borderColor={borderColor}
              borderWidth={1}
              borderRadius="$4"
              p="$2"
              disabled={isInOfacList}
              opacity={isInOfacList ? 0.7 : 1}
            />
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
                  trackEvent(MockDataEvents.DECREASE_EXPIRY_YEARS);
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
                  trackEvent(MockDataEvents.INCREASE_EXPIRY_YEARS);
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
                trackEvent(MockDataEvents.TOGGLE_OFAC_LIST);
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
          <PrimaryButton
            trackEvent={MockDataEvents.GENERATE_DATA}
            onPress={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Spinner color="gray" size="small" />
            ) : (
              'Generate Passport Data'
            )}
          </PrimaryButton>
          <SecondaryButton
            trackEvent={MockDataEvents.CANCEL_GENERATION}
            onPress={() => navigation.goBack()}
          >
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
                    trackEvent(MockDataEvents.SELECT_COUNTRY);
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
                        trackEvent(MockDataEvents.SELECT_ALGORITHM);
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
