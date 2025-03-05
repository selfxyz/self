import { useNavigation } from '@react-navigation/native';
import { ChevronDown, Cpu, Minus, Plus, X } from '@tamagui/lucide-icons';
import { flag } from 'country-emoji';
import getCountryISO2 from 'country-iso-3-to-2';
import React, { useCallback, useMemo, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import crypto from 'react-native-quick-crypto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  Fieldset,
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
import { usePassport } from '../stores/passportDataProvider';
import { borderColor, separatorColor, textBlack, white } from '../utils/colors';
import { buttonTap, selectionChange } from '../utils/haptic';

interface MockDataScreenProps {}

const SIGNATURE_ALGORITHM_MAP = {
  'rsa sha256': 'rsa_sha256_65537_4096',
  'rsa sha1': 'rsa_sha1_65537_2048',
  'rsapss sha256': 'rsapss_sha256_65537_2048',
} as const;

const COUNTRY_SHEET_SNAP_POINTS = [60];
const ALGORITHM_SHEET_SNAP_POINTS = [40];
const COUNTRY_LIST = Object.keys(countryCodes);
const ALGORITHM_LIST = ['rsa sha256', 'rsa sha1', 'rsapss sha256'];

const MockDataScreen: React.FC<MockDataScreenProps> = () => {
  const navigation = useNavigation();
  const [age, setAge] = useState(24);
  const [expiryYears, setExpiryYears] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInOfacList, setIsInOfacList] = useState(false);
  const castDate = (yearsOffset: number): string => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + yearsOffset);
    return (
      date.toISOString().slice(2, 4) +
      date.toISOString().slice(5, 7) +
      date.toISOString().slice(8, 10)
    ).toString();
  };
  const { setData } = usePassport();

  const [selectedCountry, setSelectedCountry] = useState('USA');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('rsa sha256');
  const [isCountrySheetOpen, setCountrySheetOpen] = useState(false);
  const [isAlgorithmSheetOpen, setAlgorithmSheetOpen] = useState(false);

  const handleCountrySelect = useCallback((countryCode: string): void => {
    setSelectedCountry(countryCode);
    setCountrySheetOpen(false);
  }, []);

  const handleAlgorithmSelect = useCallback((algorithm: string): void => {
    setSelectedAlgorithm(algorithm);
    setAlgorithmSheetOpen(false);
  }, []);

  const handleGenerate = useCallback(async (): Promise<void> => {
    setIsGenerating(true);
    const randomArrayValue = new Uint32Array(1);
    crypto.getRandomValues(randomArrayValue);
    const randomPassportNumber = randomArrayValue[0]
      .toString(36)
      .substring(2, 11)
      .replace(/[^a-z0-9]/gi, '')
      .toUpperCase();
    await new Promise(resolve =>
      setTimeout(async () => {
        let mockPassportData;
        if (isInOfacList) {
          mockPassportData = genMockPassportData(
            'sha1',
            'sha256',
            SIGNATURE_ALGORITHM_MAP[
              selectedAlgorithm as keyof typeof SIGNATURE_ALGORITHM_MAP
            ],
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
            'sha1',
            'sha256',
            SIGNATURE_ALGORITHM_MAP[
              selectedAlgorithm as keyof typeof SIGNATURE_ALGORITHM_MAP
            ],
            selectedCountry as keyof typeof countryCodes,
            castDate(-age),
            castDate(expiryYears),
            randomPassportNumber,
          );
        }

        await setData(mockPassportData);
        resolve(null);
      }, 0),
    );

    await new Promise(resolve => setTimeout(resolve, 1000));
    navigation.navigate('ConfirmBelongingScreen', {
      mockPassportFlow: true,
    });
  }, [
    navigation,
    isInOfacList,
    setData,
    selectedAlgorithm,
    selectedCountry,
    expiryYears,
    age,
  ]);

  const { top, bottom } = useSafeAreaInsets();

  const ofacWarningStyle = useMemo(
    () => ({ opacity: isInOfacList ? 1 : 0 }),
    [isInOfacList],
  );

  const handleButtonPress = useCallback((action: () => void): void => {
    buttonTap();
    action();
  }, []);

  const handleSheetClose = useCallback((): void => {
    selectionChange();
    setCountrySheetOpen(false);
  }, []);

  const handleAlgorithmSheetClose = useCallback((): void => {
    selectionChange();
    setAlgorithmSheetOpen(false);
  }, []);

  const handleAgeDecrease = useCallback((): void => {
    handleButtonPress(() => setAge(age - 1));
  }, [age, handleButtonPress]);

  const handleAgeIncrease = useCallback((): void => {
    handleButtonPress(() => setAge(age + 1));
  }, [age, handleButtonPress]);

  const handleExpiryDecrease = useCallback((): void => {
    handleButtonPress(() => setExpiryYears(expiryYears - 1));
  }, [expiryYears, handleButtonPress]);

  const handleExpiryIncrease = useCallback((): void => {
    handleButtonPress(() => setExpiryYears(expiryYears + 1));
  }, [expiryYears, handleButtonPress]);

  const handleOfacToggle = useCallback((): void => {
    handleButtonPress(() => setIsInOfacList(!isInOfacList));
  }, [isInOfacList, handleButtonPress]);

  const handleAlgorithmPress = useCallback((): void => {
    handleButtonPress(() => setAlgorithmSheetOpen(true));
  }, [handleButtonPress]);

  const handleCountryPress = useCallback((): void => {
    handleButtonPress(() => setCountrySheetOpen(true));
  }, [handleButtonPress]);

  const handleCountrySelectWithClose = useCallback(
    (countryCode: string): void => {
      buttonTap();
      handleCountrySelect(countryCode);
    },
    [handleCountrySelect],
  );

  const handleAlgorithmSelectWithClose = useCallback(
    (algorithm: string): void => {
      buttonTap();
      handleAlgorithmSelect(algorithm);
    },
    [handleAlgorithmSelect],
  );

  const getCountryPressHandler = useCallback(
    (countryCode: string): (() => void) =>
      () => {
        handleCountrySelectWithClose(countryCode);
      },
    [handleCountrySelectWithClose],
  );

  const getAlgorithmPressHandler = useCallback(
    (algorithm: string): (() => void) =>
      () => {
        handleAlgorithmSelectWithClose(algorithm);
      },
    [handleAlgorithmSelectWithClose],
  );

  const renderCountryItem = useCallback(
    (countryCode: string) => (
      <TouchableOpacity
        key={countryCode}
        onPress={getCountryPressHandler(countryCode)}
      >
        <XStack py="$3" px="$2">
          <Text fontSize="$4">
            {countryCodes[countryCode as keyof typeof countryCodes]}{' '}
            {flag(getCountryISO2(countryCode))}
          </Text>
        </XStack>
      </TouchableOpacity>
    ),
    [getCountryPressHandler],
  );

  const renderAlgorithmItem = useCallback(
    (algorithm: string) => (
      <TouchableOpacity
        key={algorithm}
        onPress={getAlgorithmPressHandler(algorithm)}
      >
        <XStack py="$3" px="$2">
          <Text fontSize="$4">{algorithm}</Text>
        </XStack>
      </TouchableOpacity>
    ),
    [getAlgorithmPressHandler],
  );

  const renderCountryList = useMemo(
    () => COUNTRY_LIST.map(renderCountryItem),
    [renderCountryItem],
  );
  const renderAlgorithmList = useMemo(
    () => ALGORITHM_LIST.map(renderAlgorithmItem),
    [renderAlgorithmItem],
  );

  return (
    <>
      <YStack
        f={1}
        gap="$4"
        px="$4"
        backgroundColor={white}
        paddingTop={top}
        paddingBottom={bottom}
      >
        <Text my="$9" textAlign="center" fontSize="$9" color={textBlack}>
          Generate passport data
        </Text>
        <XStack ai="center">
          <Text f={1} fontSize="$5">
            Encryption
          </Text>
          <Button
            onPress={handleAlgorithmPress}
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
        <XStack ai="center">
          <Text f={1} fontSize="$5">
            Nationality
          </Text>
          <Button
            onPress={handleCountryPress}
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

        <Fieldset mt="$2" gap="$2" horizontal>
          <Text
            color={textBlack}
            width={160}
            justifyContent="flex-end"
            fontSize="$5"
          >
            Age (🎂)
          </Text>
          <XStack f={1} />

          <Button
            h="$3.5"
            w="$3.5"
            bg="white"
            jc="center"
            borderColor={borderColor}
            borderWidth={1}
            borderRadius="$10"
            onPress={handleAgeDecrease}
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
            onPress={handleAgeIncrease}
            disabled={isInOfacList}
          >
            <Plus />
          </Button>
        </Fieldset>

        <Fieldset gap="$2" horizontal>
          <Text
            color={textBlack}
            width={160}
            justifyContent="flex-end"
            fontSize="$5"
          >
            Passport expires in
          </Text>
          <XStack f={1} />

          <Button
            h="$3.5"
            w="$3.5"
            bg="white"
            jc="center"
            borderColor={borderColor}
            borderWidth={1}
            borderRadius="$10"
            onPress={handleExpiryDecrease}
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
            onPress={handleExpiryIncrease}
          >
            <Plus />
          </Button>
        </Fieldset>

        <YStack>
          <Fieldset mt="$2" gap="$2" horizontal>
            <Text
              color={textBlack}
              width={160}
              justifyContent="flex-end"
              fontSize="$5"
            >
              Is in OFAC list
            </Text>
            <XStack f={1} />
            <Switch
              size="$3.5"
              checked={isInOfacList}
              onCheckedChange={handleOfacToggle}
              bg={isInOfacList ? '$green7Light' : '$gray4'}
            >
              <Switch.Thumb animation="quick" bc="white" />
            </Switch>
          </Fieldset>
          <Text
            mt="$2"
            color="$red10"
            justifyContent="flex-end"
            fontSize="$3"
            style={ofacWarningStyle}
          >
            OFAC list is a list of people who are suspected of being involved in
            terrorism or other illegal activities.
          </Text>
        </YStack>

        <YStack f={1} />

        <YStack>
          <Text mb="$2" textAlign="center" fontSize="$4" color={textBlack}>
            These passport data are only for testing purposes.
          </Text>
          <Button onPress={handleGenerate} disabled={isGenerating}>
            {isGenerating ? <Spinner /> : <Cpu color={textBlack} />} Generate
            passport data
          </Button>
        </YStack>
      </YStack>
      <Sheet
        modal
        open={isCountrySheetOpen}
        onOpenChange={setCountrySheetOpen}
        snapPoints={COUNTRY_SHEET_SNAP_POINTS}
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
              <XStack onPress={handleSheetClose} p="$2">
                <X color={borderColor} size="$1.5" mr="$2" />
              </XStack>
            </XStack>
            <Separator borderColor={separatorColor} mb="$4" />
            <ScrollView showsVerticalScrollIndicator={false}>
              {renderCountryList}
            </ScrollView>
          </YStack>
        </Sheet.Frame>
      </Sheet>

      <Sheet
        modal
        open={isAlgorithmSheetOpen}
        onOpenChange={setAlgorithmSheetOpen}
        snapPoints={ALGORITHM_SHEET_SNAP_POINTS}
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
              <XStack onPress={handleAlgorithmSheetClose} p="$2">
                <X color={borderColor} size="$1.5" mr="$2" />
              </XStack>
            </XStack>
            <Separator borderColor={separatorColor} mb="$4" />
            <ScrollView showsVerticalScrollIndicator={false}>
              {renderAlgorithmList}
            </ScrollView>
          </YStack>
        </Sheet.Frame>
      </Sheet>
    </>
  );
};

export default MockDataScreen;
