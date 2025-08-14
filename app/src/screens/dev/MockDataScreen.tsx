// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { flag } from 'country-emoji';
import getCountryISO2 from 'country-iso-3-to-2';
import React, { useCallback, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { useNavigation } from '@react-navigation/native';
import { ChevronDown, Minus, Plus, X } from '@tamagui/lucide-icons';

import { countryCodes } from '@selfxyz/common/constants';
import type { IdDocInput } from '@selfxyz/common/utils';
import { getSKIPEM } from '@selfxyz/common/utils/csca';
import {
  generateMockDSC,
  genMockIdDoc,
  initPassportDataParsing,
} from '@selfxyz/common/utils/passports';

import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import ButtonsContainer from '@/components/ButtonsContainer';
import { Caption } from '@/components/typography/Caption';
import { MockDataEvents } from '@/consts/analytics';
import SelfDevCard from '@/images/card-dev.svg';
import IdIcon from '@/images/icons/id_icon.svg';
import NoteIcon from '@/images/icons/note.svg';
import { storePassportData } from '@/providers/passportDataProvider';
import analytics from '@/utils/analytics';
import {
  black,
  borderColor,
  separatorColor,
  slate100,
  slate200,
  slate400,
  slate500,
  textBlack,
  white,
  zinc400,
} from '@/utils/colors';
import { extraYPadding } from '@/utils/constants';
import { dinot, plexMono } from '@/utils/fonts';
import { buttonTap, selectionChange } from '@/utils/haptic';

const { trackEvent } = analytics();

const documentTypes = {
  mock_passport: 'Passport',
  mock_id_card: 'ID Card',
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
  'sha256 rsapss 65537 3072': ['sha256', 'sha256', 'rsapss_sha256_65537_3072'],
  'sha256 rsapss 65537 4096': ['sha256', 'sha256', 'rsapss_sha256_65537_4096'],
  'sha384 rsapss 65537 2048': ['sha384', 'sha384', 'rsapss_sha384_65537_2048'],
  'sha384 rsapss 65537 3072': ['sha384', 'sha384', 'rsapss_sha384_65537_3072'],
  'sha512 rsapss 65537 2048': ['sha512', 'sha512', 'rsapss_sha512_65537_2048'],
  'sha512 rsapss 65537 4096': ['sha512', 'sha512', 'rsapss_sha512_65537_4096'],
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

const formatDateToYYMMDD = (date: Date): string => {
  return (
    date.toISOString().slice(2, 4) +
    date.toISOString().slice(5, 7) +
    date.toISOString().slice(8, 10)
  ).toString();
};

const getBirthDateFromAge = (age: number): string => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - age);
  return formatDateToYYMMDD(date);
};

const getExpiryDateFromYears = (years: number): string => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + years);
  return formatDateToYYMMDD(date);
};

const MockPassportTitleCard = () => {
  return (
    <YStack
      backgroundColor="#18181B"
      borderRadius={12}
      borderColor="#27272A"
      borderWidth={1}
      flexDirection="column"
      alignItems="flex-start"
      padding={20}
      gap={20}
    >
      <YStack
        minWidth={46}
        minHeight={46}
        backgroundColor="#606060"
        justifyContent="center"
        alignItems="center"
        borderRadius={3}
      >
        <IdIcon />
      </YStack>
      <YStack flex={1} flexDirection="column" gap={2}>
        <Text fontFamily={dinot} fontWeight={500} fontSize="$6" color={white}>
          Generate mock passport data
        </Text>
        <Caption fontFamily={dinot} fontSize="$5" color={zinc400}>
          Configure data parameters to generate a mock passport for testing
          purposes on the Self Protocol.
        </Caption>
      </YStack>
    </YStack>
  );
};

const HeroBanner = () => {
  return (
    <YStack backgroundColor={white} marginBottom="$6" position="relative">
      <YStack
        backgroundColor={black}
        zIndex={1}
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom="15%"
      />
      <YStack zIndex={2}>
        <YStack padding="$4">
          <MockPassportTitleCard />
        </YStack>
        <YStack
          shadowColor={black}
          shadowOffset={{ width: 0, height: 2 }}
          shadowOpacity={0.5}
          shadowRadius={5}
        >
          <SelfDevCard width="100%" />
        </YStack>
      </YStack>
    </YStack>
  );
};

type FormSectionProps = {
  title: string;
  endSection?: boolean;
  children: React.ReactNode;
};

const FormSection: React.FC<FormSectionProps> = ({
  title,
  endSection = false,
  children,
}) => {
  const borderBottomWidth = endSection ? 0 : 1;
  return (
    <YStack
      padding={20}
      justifyContent="space-between"
      gap={10}
      borderBottomWidth={borderBottomWidth}
      borderColor={slate200}
    >
      <Text
        fontFamily={dinot}
        textTransform="uppercase"
        color={slate400}
        fontSize="$4"
      >
        {title}
      </Text>
      {children}
    </YStack>
  );
};

const MockDataScreen: React.FC = () => {
  const navigation = useNavigation();
  const [age, setAge] = useState(21);
  const [expiryYears, setExpiryYears] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInOfacList, setIsInOfacList] = useState(true);
  const [selectedDocumentType, setSelectedDocumentType] = useState<
    'mock_passport' | 'mock_id_card'
  >('mock_passport');
  const [selectedCountry, setSelectedCountry] = useState('USA');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(
    'sha256 rsa 65537 2048',
  );
  const [isCountrySheetOpen, setCountrySheetOpen] = useState(false);
  const [isAlgorithmSheetOpen, setAlgorithmSheetOpen] = useState(false);
  const [isDocumentTypeSheetOpen, setDocumentTypeSheetOpen] = useState(false);

  const resetFormValues = () => {
    setAge(21);
    setExpiryYears(5);
    setIsInOfacList(true);
    setSelectedDocumentType('mock_passport');
    setSelectedAlgorithm('sha256 rsa 65537 2048');
    setSelectedCountry('USA');
  };

  const handleCountrySelect = (countryCode: string) => {
    setSelectedCountry(countryCode);
    setCountrySheetOpen(false);
  };

  const handleAlgorithmSelect = (algorithm: string) => {
    setSelectedAlgorithm(algorithm);
    setAlgorithmSheetOpen(false);
  };

  const handleDocumentTypeSelect = (
    documentType: 'mock_passport' | 'mock_id_card',
  ) => {
    setSelectedDocumentType(documentType);
    setDocumentTypeSheetOpen(false);
  };

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const randomPassportNumber = Math.random()
        .toString(36)
        .substring(2, 11)
        .replace(/[^a-z0-9]/gi, '')
        .toUpperCase();
      const algorithmMapping =
        signatureAlgorithmToStrictSignatureAlgorithm[
          selectedAlgorithm as keyof typeof signatureAlgorithmToStrictSignatureAlgorithm
        ];
      const dgHashAlgo = algorithmMapping[0];
      const eContentHashAlgo = algorithmMapping[1];
      const signatureTypeForGeneration = algorithmMapping[2];

      const idDocInput: Partial<IdDocInput> = {
        nationality: selectedCountry as IdDocInput['nationality'],
        idType: selectedDocumentType as IdDocInput['idType'],
        dgHashAlgo: dgHashAlgo as IdDocInput['dgHashAlgo'],
        eContentHashAlgo: eContentHashAlgo as IdDocInput['eContentHashAlgo'],
        signatureType:
          signatureTypeForGeneration as IdDocInput['signatureType'],
        expiryDate: getExpiryDateFromYears(expiryYears),
        passportNumber: randomPassportNumber,
      };

      let dobForGeneration: string;
      if (isInOfacList) {
        dobForGeneration = '541007';
        idDocInput.lastName = 'HENAO MONTOYA';
        idDocInput.firstName = 'ARCANGEL DE JESUS';
      } else {
        dobForGeneration = getBirthDateFromAge(age);
      }
      idDocInput.birthDate = dobForGeneration;
      let mockDSC, rawMockData;
      try {
        mockDSC = await generateMockDSC(
          idDocInput.signatureType || 'rsa_sha256_65537_2048',
        );
        rawMockData = genMockIdDoc(idDocInput, mockDSC);
      } catch (error) {
        console.warn(
          'Falling back to default mock DSC. Error during mock DSC generation:',
          error,
        );
        rawMockData = genMockIdDoc(idDocInput);
      }
      const skiPem = await getSKIPEM('staging');
      const parsedMockData = initPassportDataParsing(rawMockData, skiPem);
      await storePassportData(parsedMockData);
      navigation.navigate('ConfirmBelongingScreen', {});
    } catch (error) {
      console.error('Error during mock data generation:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [
    age,
    expiryYears,
    isInOfacList,
    navigation,
    selectedAlgorithm,
    selectedCountry,
    selectedDocumentType,
  ]);

  const devModeTap = Gesture.Tap()
    .numberOfTaps(5)
    .onStart(() => {
      buttonTap();
      trackEvent(MockDataEvents.ENABLE_ADVANCED_MODE);
    });

  const { bottom } = useSafeAreaInsets();
  return (
    <YStack
      flex={1}
      backgroundColor={white}
      paddingBottom={bottom + extraYPadding}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <GestureDetector gesture={devModeTap}>
          <HeroBanner />
        </GestureDetector>
        <YStack paddingHorizontal="$4" paddingBottom="$4" gap="$4">
          <Text fontWeight={500} fontSize="$6" fontFamily={dinot}>
            Mock Passport Parameters
          </Text>
          <YStack
            borderRadius={10}
            borderWidth={1}
            borderColor={slate200}
            backgroundColor={slate100}
          >
            <FormSection title="Encryption Preference">
              <Button
                onPress={() => {
                  buttonTap();
                  setAlgorithmSheetOpen(true);
                }}
                paddingVertical="$5"
                paddingHorizontal="$3"
                backgroundColor="white"
                borderColor={slate200}
                borderWidth={1}
                borderRadius={5}
              >
                <XStack justifyContent="space-between" width="100%">
                  <Text fontSize="$4" fontFamily={plexMono} color={black}>
                    {selectedAlgorithm}
                  </Text>
                  <ChevronDown size={20} color={slate500} />
                </XStack>
              </Button>
            </FormSection>

            <FormSection title="Document Type">
              <Button
                onPress={() => {
                  buttonTap();
                  setDocumentTypeSheetOpen(true);
                }}
                paddingVertical="$5"
                paddingHorizontal="$3"
                backgroundColor="white"
                borderColor={slate200}
                borderWidth={1}
                borderRadius={5}
              >
                <XStack justifyContent="space-between" width="100%">
                  <Text
                    fontSize="$4"
                    fontFamily={plexMono}
                    color={black}
                    textTransform="uppercase"
                  >
                    {
                      documentTypes[
                        selectedDocumentType as keyof typeof documentTypes
                      ]
                    }
                  </Text>
                  <ChevronDown size={20} color={slate500} />
                </XStack>
              </Button>
            </FormSection>

            <FormSection title="Nationality">
              <Button
                onPress={() => {
                  buttonTap();
                  setCountrySheetOpen(true);
                  trackEvent(MockDataEvents.OPEN_COUNTRY_SELECTION);
                }}
                paddingVertical="$5"
                paddingHorizontal="$3"
                backgroundColor="white"
                borderColor={slate200}
                borderWidth={1}
                borderRadius={5}
              >
                <XStack justifyContent="space-between" width="100%">
                  <Text
                    fontSize="$4"
                    fontFamily={plexMono}
                    color={black}
                    textTransform="uppercase"
                  >
                    {flag(getCountryISO2(selectedCountry))}
                    {'   '}
                    {countryCodes[selectedCountry as keyof typeof countryCodes]}
                  </Text>
                  <ChevronDown size={20} color={slate500} />
                </XStack>
              </Button>
            </FormSection>

            <FormSection title="Age">
              <XStack
                alignItems="center"
                gap="$2"
                justifyContent="space-between"
              >
                <Button
                  height="$3.5"
                  width="$6"
                  backgroundColor="white"
                  justifyContent="center"
                  borderColor={slate200}
                  borderWidth={1}
                  onPress={() => {
                    buttonTap();
                    setAge(age - 1);
                    trackEvent(MockDataEvents.DECREASE_AGE);
                  }}
                  disabled={expiryYears <= 0}
                >
                  <Minus color={slate500} />
                </Button>
                <Text
                  textTransform="uppercase"
                  textAlign="center"
                  color={textBlack}
                  fontWeight="500"
                  fontSize="$4"
                  fontFamily={plexMono}
                >
                  {age} years or older
                </Text>
                <Button
                  height="$3.5"
                  width="$6"
                  backgroundColor="white"
                  justifyContent="center"
                  borderColor={slate200}
                  borderWidth={1}
                  onPress={() => {
                    buttonTap();
                    setAge(age + 1);
                    trackEvent(MockDataEvents.INCREASE_AGE);
                  }}
                >
                  <Plus color={slate500} />
                </Button>
              </XStack>
            </FormSection>

            <FormSection title="Passport Expires In">
              <XStack
                alignItems="center"
                gap="$2"
                justifyContent="space-between"
              >
                <Button
                  height="$3.5"
                  width="$6"
                  backgroundColor="white"
                  justifyContent="center"
                  borderColor={slate200}
                  borderWidth={1}
                  onPress={() => {
                    buttonTap();
                    setExpiryYears(expiryYears - 1);
                    trackEvent(MockDataEvents.DECREASE_EXPIRY_YEARS);
                  }}
                  disabled={expiryYears <= 0}
                >
                  <Minus color={slate500} />
                </Button>
                <Text
                  textTransform="uppercase"
                  textAlign="center"
                  color={textBlack}
                  fontWeight="500"
                  fontSize="$4"
                  fontFamily={plexMono}
                >
                  {expiryYears} years
                </Text>
                <Button
                  height="$3.5"
                  width="$6"
                  backgroundColor="white"
                  justifyContent="center"
                  borderColor={slate200}
                  borderWidth={1}
                  onPress={() => {
                    buttonTap();
                    setExpiryYears(expiryYears + 1);
                    trackEvent(MockDataEvents.INCREASE_EXPIRY_YEARS);
                  }}
                >
                  <Plus color={slate500} />
                </Button>
              </XStack>
            </FormSection>

            <FormSection title="In OFAC sanction list" endSection={true}>
              <YStack flexDirection="column" gap="$2">
                <YStack
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="center"
                  width="100%"
                  borderWidth={1}
                  borderColor={slate200}
                  borderRadius={5}
                  backgroundColor={white}
                  paddingVertical="$3"
                  paddingHorizontal="$4"
                >
                  <Text textTransform="uppercase">Not on list</Text>
                  <Switch
                    size="$3.5"
                    checked={!isInOfacList}
                    onCheckedChange={() => {
                      buttonTap();
                      setIsInOfacList(!isInOfacList);
                      trackEvent(MockDataEvents.TOGGLE_OFAC_LIST);
                    }}
                    backgroundColor="$gray12"
                    borderRadius={10}
                    height={34}
                    width={65}
                    padding="$1.5"
                    flexDirection="row"
                    justifyContent="center"
                    alignSelf="center"
                    unstyled={true}
                  >
                    <Switch.Thumb
                      animation="quick"
                      backgroundColor="white"
                      height={26}
                      width={26}
                      borderRadius={6}
                      unstyled={true}
                    />
                  </Switch>
                </YStack>
                <YStack
                  flexDirection="row"
                  gap="$3"
                  alignItems="center"
                  width="100%"
                >
                  <NoteIcon width={25} height={25} color={slate400} />
                  <Text
                    color={slate400}
                    fontSize="$2"
                    textTransform="uppercase"
                    flex={1}
                    letterSpacing={0.04}
                  >
                    OFAC list is a list of people who are suspected of being
                    involved in terrorism or other illegal activities.
                  </Text>
                </YStack>
              </YStack>
            </FormSection>
            <YStack
              paddingHorizontal="$4"
              paddingVertical="$2"
              marginBottom="$3"
            >
              <Button
                backgroundColor={slate200}
                color={slate500}
                fontFamily={dinot}
                onPress={() => {
                  buttonTap();
                  resetFormValues();
                }}
              >
                Reset all values
              </Button>
            </YStack>
          </YStack>
        </YStack>

        <YStack paddingHorizontal="$4" paddingBottom="$4">
          <ButtonsContainer>
            <PrimaryButton
              trackEvent={MockDataEvents.GENERATE_DATA}
              onPress={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Spinner color="gray" size="small" />
              ) : (
                'Generate Mock Passport'
              )}
            </PrimaryButton>
          </ButtonsContainer>
        </YStack>
      </ScrollView>

      <Sheet
        modal
        open={isDocumentTypeSheetOpen}
        onOpenChange={setDocumentTypeSheetOpen}
        snapPoints={[60]}
        animation="medium"
        disableDrag
      >
        <Sheet.Overlay />
        <Sheet.Frame
          backgroundColor={white}
          borderTopLeftRadius="$9"
          borderTopRightRadius="$9"
        >
          <YStack padding="$4">
            <XStack
              alignItems="center"
              justifyContent="space-between"
              marginBottom="$4"
            >
              <Text fontSize="$8">Select a document type</Text>
              <XStack
                onPress={() => {
                  selectionChange();
                  setDocumentTypeSheetOpen(false);
                }}
                padding="$2"
              >
                <X color={borderColor} size="$1.5" marginRight="$2" />
              </XStack>
            </XStack>
            <Separator borderColor={separatorColor} marginBottom="$4" />
            <ScrollView showsVerticalScrollIndicator={false}>
              {Object.entries(documentTypes).map(([docType, displayText]) => (
                <TouchableOpacity
                  key={docType}
                  onPress={() => {
                    buttonTap();
                    handleDocumentTypeSelect(
                      docType as 'mock_passport' | 'mock_id_card',
                    );
                    setDocumentTypeSheetOpen(false);
                    trackEvent(MockDataEvents.SELECT_DOCUMENT_TYPE);
                  }}
                >
                  <XStack paddingVertical="$3" paddingHorizontal="$2">
                    <Text fontSize="$4">{displayText}</Text>
                  </XStack>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </YStack>
        </Sheet.Frame>
      </Sheet>

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
          backgroundColor={white}
          borderTopLeftRadius="$9"
          borderTopRightRadius="$9"
        >
          <YStack padding="$4">
            <XStack
              alignItems="center"
              justifyContent="space-between"
              marginBottom="$4"
            >
              <Text fontSize="$8">Select a country</Text>
              <XStack
                onPress={() => {
                  selectionChange();
                  setCountrySheetOpen(false);
                }}
                padding="$2"
              >
                <X color={borderColor} size="$1.5" marginRight="$2" />
              </XStack>
            </XStack>
            <Separator borderColor={separatorColor} marginBottom="$4" />
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
                  <XStack paddingVertical="$3" paddingHorizontal="$2">
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
          backgroundColor={white}
          borderTopLeftRadius="$9"
          borderTopRightRadius="$9"
        >
          <YStack padding="$4">
            <XStack
              alignItems="center"
              justifyContent="space-between"
              marginBottom="$4"
            >
              <Text fontSize="$8">Select an algorithm</Text>
              <XStack
                onPress={() => {
                  selectionChange();
                  setAlgorithmSheetOpen(false);
                }}
                padding="$2"
              >
                <X color={borderColor} size="$1.5" marginRight="$2" />
              </XStack>
            </XStack>
            <Separator borderColor={separatorColor} marginBottom="$4" />
            <ScrollView showsVerticalScrollIndicator={false}>
              <YStack paddingBottom="$10">
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
                      <XStack paddingVertical="$3" paddingHorizontal="$2">
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
