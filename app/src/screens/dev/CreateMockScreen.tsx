// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { flag } from 'country-emoji';
import React, { useCallback, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronDown, Minus, Plus, X } from '@tamagui/lucide-icons';

import { countryCodes } from '@selfxyz/common/constants';
import { getCountryISO2 } from '@selfxyz/common/constants/countries';
import {
  dinot,
  generateMockDocument,
  plexMono,
  signatureAlgorithmToStrictSignatureAlgorithm,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import {
  ButtonsContainer,
  Caption,
  PrimaryButton,
} from '@selfxyz/mobile-sdk-alpha/components';
import { MockDataEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
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
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import IdIcon from '@/assets/icons/id_icon.svg';
import NoteIcon from '@/assets/icons/note.svg';
import SelfDevCard from '@/assets/images/card_dev.svg';
import { useMockDataForm } from '@/hooks/useMockDataForm';
import { buttonTap, selectionChange } from '@/integrations/haptics';
import type { RootStackParamList } from '@/navigation';
import { storePassportData } from '@/providers/passportDataProvider';
import { extraYPadding } from '@/utils/styleUtils';

const documentTypes = {
  mock_passport: 'Passport',
  mock_id_card: 'ID Card',
  mock_aadhaar: 'Aadhaar',
};

const MockDocumentTitleCard = () => {
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
          Generate mock document data
        </Text>
        <Caption style={{ fontFamily: dinot, fontSize: 20, color: zinc400 }}>
          Configure data parameters to generate a mock document for testing
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
          <MockDocumentTitleCard />
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

const CreateMockScreen: React.FC = () => {
  const { trackEvent } = useSelfClient();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    age,
    setAge,
    expiryYears,
    setExpiryYears,
    selectedCountry,
    handleCountrySelect,
    selectedAlgorithm,
    handleAlgorithmSelect,
    selectedDocumentType,
    handleDocumentTypeSelect,
    isInOfacList,
    setIsInOfacList,
    resetFormValues,
  } = useMockDataForm();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCountrySheetOpen, setCountrySheetOpen] = useState(false);
  const [isAlgorithmSheetOpen, setAlgorithmSheetOpen] = useState(false);
  const [isDocumentTypeSheetOpen, setDocumentTypeSheetOpen] = useState(false);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);

    // Allow React to update the UI state
    await new Promise(resolve => setTimeout(resolve, 0));

    try {
      const parsedMockData = await generateMockDocument({
        age,
        expiryYears,
        isInOfacList,
        selectedAlgorithm,
        selectedCountry,
        selectedDocumentType,
      });
      await storePassportData(parsedMockData);
      navigation.navigate('ConfirmBelonging', {});
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
          <View collapsable={false}>
            <HeroBanner />
          </View>
        </GestureDetector>
        <YStack paddingHorizontal="$4" paddingBottom="$4" gap="$4">
          <Text fontWeight={500} fontSize="$6" fontFamily={dinot}>
            Mock Document Parameters
          </Text>
          <YStack
            borderRadius={10}
            borderWidth={1}
            borderColor={slate200}
            backgroundColor={slate100}
          >
            {selectedDocumentType !== 'mock_aadhaar' && (
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
            )}

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

            {selectedDocumentType !== 'mock_aadhaar' && (
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
                      {
                        countryCodes[
                          selectedCountry as keyof typeof countryCodes
                        ]
                      }
                    </Text>
                    <ChevronDown size={20} color={slate500} />
                  </XStack>
                </Button>
              </FormSection>
            )}

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
                  disabled={age <= 1}
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

            {selectedDocumentType !== 'mock_aadhaar' && (
              <FormSection title="Document Expires In">
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
                    disabled={age <= 0}
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
            )}

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
                'Generate Mock Document'
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
                      docType as
                        | 'mock_passport'
                        | 'mock_id_card'
                        | 'mock_aadhaar',
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

export default CreateMockScreen;
