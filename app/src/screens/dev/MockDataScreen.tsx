// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { useNavigation } from '@react-navigation/native';
import { countryCodes } from '@selfxyz/common';
import { getSKIPEM } from '@selfxyz/common';
import { genMockIdDoc, IdDocInput } from '@selfxyz/common';
import { initPassportDataParsing } from '@selfxyz/common';
import { ChevronDown, Minus, Plus, Rows, X } from '@tamagui/lucide-icons';
import { flag } from 'country-emoji';
import getCountryISO2 from 'country-iso-3-to-2';
import React, { useCallback, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
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
// import { LinearGradient } from 'tamagui/linear-gradient';
import SelfCard from '../../images/card-style-1.svg';
import IdIcon from '../../images/icons/id_icon.svg';
import NoteIcon from '../../images/icons/note.svg';
import WarningIcon from '../../images/icons/warning.svg';
import { yellow500 } from '../../utils/colors';

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
  black,
  zinc400,
  slate100,
  slate200,
  slate400,
  slate500,
} from '../../utils/colors';
import { extraYPadding } from '../../utils/constants';
import { buttonTap, selectionChange } from '../../utils/haptic';

import { Caption } from '../../components/typography/Caption';
import { dinot, plexMono } from '../../utils/fonts';


const { trackEvent } = analytics();

interface MockDataScreenProps {}

const documentTypes = {
  mock_passport: 'Passport',
  mock_id_card: 'ID Card',
};

const MockPassportTitleCard = () => {
  return (
    <View
      backgroundColor="#18181B"
      borderRadius={12}
      borderColor="#27272A"
      borderWidth={1}
      flexDirection="column"
      alignItems="flex-start"
      padding={20}
      gap={20}
    >
      <View
        minWidth={46}
        minHeight={46}
        backgroundColor="#606060"
        justifyContent="center"
        alignItems="center"
        borderRadius={3}
      >
        <IdIcon />
      </View>
      <View flex={1} flexDirection="column" gap={2}>
        <Text fontFamily={dinot} fontWeight={500} fontSize="$6" color={white}>
          Generate mock passport data
        </Text>
        <Caption fontFamily={dinot} fontSize="$5" color={zinc400}>
          Configure data parameters to generate a mock passport for testing purposes on the Self Protocol.
        </Caption>
      </View>
    </View>
  );
};

const HeroBanner = () => {
  return (
    <YStack bg={white} marginBottom="$8" position='relative'>
      <YStack
        bg={black}
        zIndex={1}
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom="15%"
      />
      <YStack zIndex={2}>
        <YStack p="$4">
          <MockPassportTitleCard />
        </YStack>
        <YStack
          shadowColor={black}
          shadowOffset={{ width: 0, height: 2 }}
          shadowOpacity={0.5}
          shadowRadius={5}
        >
          <SelfCard width="100%" />
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

const FormSection: React.FC<FormSectionProps> = ({ title, endSection=false, children }) => {
  const borderBottomWidth = endSection ? 0 : 1;
  return (
    <YStack p={20}jc="space-between" gap={10} borderBottomWidth={borderBottomWidth} borderColor={slate200}>
        <Text fontFamily={dinot} textTransform="uppercase" color={slate400} fontSize="$4">
          {title}
        </Text>
        {children}
    </YStack>
  );
};


const MockDataScreen: React.FC<MockDataScreenProps> = ({}) => {
  const navigation = useNavigation();
  const [birthDate, setBirthDate] = useState('2000/01/01');
  const [age, setAge] = useState(21);
  const [expiryYears, setExpiryYears] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInOfacList, setIsInOfacList] = useState(true);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState('mock_passport');
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
  const [isDocumentTypeSheetOpen, setDocumentTypeSheetOpen] = useState(false);

  const resetFormValues = () => {
    setBirthDate('2000/01/01');
    setAge(21);
    setExpiryYears(5);
    setIsInOfacList(true);
    setSelectedDocumentType('mock_passport');
    setSelectedAlgorithm('sha256 rsa 65537 2048');
    setSelectedCountry('USA');
  }

  const handleCountrySelect = (countryCode: string) => {
    setSelectedCountry(countryCode);
    setCountrySheetOpen(false);
  };

  const handleAlgorithmSelect = (algorithm: string) => {
    setSelectedAlgorithm(algorithm);
    setAlgorithmSheetOpen(false);
  };

  const handleDocumentTypeSelect = (documentType: string) => {
    setSelectedDocumentType(documentType);
    setDocumentTypeSheetOpen(false);
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

  const getBirthDateFromAge = (age: number): string => {
    const today = new Date();
    today.setFullYear(today.getFullYear() - age);
    // Format as 'YYMMDD' using toLocaleDateString and string manipulation
    const parts = today.toLocaleDateString('en-CA').split('-'); // ['YYYY','MM','DD']
    const year = parts[0].slice(-2);
    const month = parts[1];
    const day = parts[2];
    return year + month + day;
  }

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
    console.log('selectedDocumentType', selectedDocumentType);
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
        expiryDate: castDateToYYMMDDForExpiry(expiryYears),
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
    age,
    expiryYears,
    isInOfacList,
    navigation,
    selectedDocumentType,
  ]);

  const devModeTap = Gesture.Tap()
    .numberOfTaps(5)
    .onStart(() => {
      setAdvancedMode(true);
      buttonTap();
      trackEvent(MockDataEvents.ENABLE_ADVANCED_MODE);
    });

  const { top, bottom } = useSafeAreaInsets();
  return (
    <YStack f={1} bg={white} pb={bottom + extraYPadding}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <GestureDetector gesture={devModeTap}>
          <HeroBanner />
        </GestureDetector>
        <YStack px="$4" pb="$4" gap="$4">
          <Text fontWeight={500} fontSize="$6" fontFamily={dinot}>Mock Passport Parameters</Text>
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
                py="$5"
                px="$3"
                bg="white"
                borderColor={slate200}
                borderWidth={1}
                borderRadius={5}
              >
                <XStack jc="space-between" w="100%">
                  <Text fontSize="$4" fontFamily={plexMono} color={black}>{selectedAlgorithm}</Text>
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
                py="$5"
                px="$3"
                bg="white"
                borderColor={slate200}
                borderWidth={1}
                borderRadius={5}
              >
                <XStack jc="space-between" w="100%">
                  <Text fontSize="$4" fontFamily={plexMono} color={black} textTransform="uppercase">
                    {documentTypes[selectedDocumentType as keyof typeof documentTypes]}
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
                  py="$5"
                  px="$3"
                  bg="white"
                  borderColor={slate200}
                  borderWidth={1}
                  borderRadius={5}
                >
                  <XStack jc="space-between" w="100%">
                    <Text fontSize="$4" fontFamily={plexMono} color={black} textTransform="uppercase">
                      {flag(getCountryISO2(selectedCountry))}{'   '}
                      {countryCodes[selectedCountry as keyof typeof countryCodes]}
                    </Text>
                    <ChevronDown size={20} color={slate500} />
                  </XStack>
                </Button>
            </FormSection>

            <FormSection title="Age">
              <XStack ai="center" gap="$2" jc="space-between">
                <Button
                  h="$3.5"
                  w="$6"
                  bg="white"
                  jc="center"
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
                  h="$3.5"
                  w="$6"
                  bg="white"
                  jc="center"
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
              <XStack ai="center" gap="$2" jc="space-between">
                <Button
                  h="$3.5"
                  w="$6"
                  bg="white"
                  jc="center"
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
                  h="$3.5"
                  w="$6"
                  bg="white"
                  jc="center"
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
                  jc="space-between"
                  ai="center"
                  w="100%"
                  borderWidth={1}
                  borderColor={slate200}
                  borderRadius={5}
                  backgroundColor={white}
                  py="$3"
                  px="$4"
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
                    bg='$gray12'
                    borderRadius={10}
                    h={34}
                    w={65}
                    p="$1.5"
                    flexDirection='row'
                    justifyContent="center"
                    alignSelf="center"
                    unstyled={true}
                  >
                    <Switch.Thumb
                      animation="quick"
                      bc="white"
                      h={26}
                      w={26}
                      borderRadius={6}
                      unstyled={true}
                    />
                  </Switch>
                </YStack>
                <YStack flexDirection="row" gap="$3" ai="center" w="100%">
                  <NoteIcon width={25} height={25} color={slate400} />
                  <Text
                    color={slate400}
                    fontSize="$2"
                    textTransform="uppercase"
                    flex={1}
                    letterSpacing={0.04}
                  >
                    OFAC list is a list of people who are suspected of being involved
                    in terrorism or other illegal activities.
                  </Text>
                </YStack>
              </YStack>
            </FormSection>
            <YStack px="$4" py="$2" mb="$3">
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

          <YStack
            px="$4"
            pb="$4"
            borderRadius="$4"
            bg={black}
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            gap="$4"
            p="$5"
          >
            <YStack
              backgroundColor="gray"
              borderRadius={5}
              width={46}
              height={46}
              jc="center"
              ai="center"
            >
              <WarningIcon width={30} height={30} color={yellow500} />
            </YStack>
            <YStack width="100%" height='100%' flex={1}>
              <Text fontSize="$5" color={white}>Proceed with caution</Text>
              <Text fontSize="$4" color={slate400}>
                Generating a mock passport will wipe all Self app data stored on this device
              </Text>
            </YStack>
          </YStack>
        </YStack>

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
          bg={white}
          borderTopLeftRadius="$9"
          borderTopRightRadius="$9"
        >
          <YStack p="$4">
            <XStack ai="center" jc="space-between" mb="$4">
              <Text fontSize="$8">Select a document type</Text>
              <XStack
                onPress={() => {
                  selectionChange();
                  setDocumentTypeSheetOpen(false);
                }}
                p="$2"
              >
                <X color={borderColor} size="$1.5" mr="$2" />
              </XStack>
            </XStack>
            <Separator borderColor={separatorColor} mb="$4" />
            <ScrollView showsVerticalScrollIndicator={false}>
              {Object.entries(documentTypes).map(([docType, displayText]) => (
                <TouchableOpacity
                  key={docType}
                  onPress={() => {
                    buttonTap();
                    handleDocumentTypeSelect(docType);
                    setDocumentTypeSheetOpen(false);
                    trackEvent(MockDataEvents.SELECT_DOCUMENT_TYPE);
                  }}
                >
                  <XStack py="$3" px="$2">
                    <Text fontSize="$4">
                      {displayText}
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
