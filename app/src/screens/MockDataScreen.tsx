import React, { useCallback, useState } from 'react';
import { TouchableOpacity } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { ChevronDown, Cpu, Minus, Plus, X } from '@tamagui/lucide-icons';
import { flag } from 'country-emoji';
import getCountryISO2 from 'country-iso-3-to-2';
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
import CustomButton from '../components/CustomButton';
import { usePassport } from '../stores/passportDataProvider';
import {
  bgWhite,
  borderColor,
  separatorColor,
  textBlack,
} from '../utils/colors';
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
  const { setData } = usePassport();

  const [selectedCountry, setSelectedCountry] = useState('USA');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('rsa sha256');
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
    'rsa sha256': 'rsa_sha256_65537_4096',
    'rsa sha1': 'rsa_sha1_65537_2048',
    'rsapss sha256': 'rsapss_sha256_65537_2048',
  } as const;

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    const randomPassportNumber = Math.random()
      .toString(36)
      .substring(2, 11)
      .replace(/[^a-z0-9]/gi, '')
      .toUpperCase();
    await new Promise(resolve =>
      setTimeout(() => {
        let mockPassportData;
        if (isInOfacList) {
          mockPassportData = genMockPassportData(
            'sha1',
            'sha256',
            signatureAlgorithmToStrictSignatureAlgorithm[
              selectedAlgorithm as keyof typeof signatureAlgorithmToStrictSignatureAlgorithm
            ],
            selectedCountry as keyof typeof countryCodes,
            castDate(-age),
            castDate(expiryYears),
            randomPassportNumber,
            'HENAO MONTOYA', // this name is on the OFAC list
            'ARCANGEL DE JESUS',
          );
        } else {
          mockPassportData = genMockPassportData(
            'sha1',
            'sha256',
            signatureAlgorithmToStrictSignatureAlgorithm[
              selectedAlgorithm as keyof typeof signatureAlgorithmToStrictSignatureAlgorithm
            ],
            selectedCountry as keyof typeof countryCodes,
            castDate(-age),
            castDate(expiryYears),
            randomPassportNumber,
          );
        }

        setData(mockPassportData);
        resolve(null);
      }, 0),
    );

    await new Promise(resolve => setTimeout(resolve, 1000));
    navigation.navigate('ConfirmBelongingScreen');
  }, [selectedAlgorithm, selectedCountry, age, expiryYears, isInOfacList]);

  return (
    <>
      <YStack f={1} gap="$4" px="$4">
        <Text my="$9" textAlign="center" fontSize="$9" color={textBlack}>
          Generate passport data
        </Text>
        <XStack ai="center">
          <Text f={1} fontSize="$5">
            Encryption
          </Text>
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
        <XStack ai="center">
          <Text f={1} fontSize="$5">
            Nationality
          </Text>
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
            onPress={() => {
              buttonTap();
              setAge(age - 1);
            }}
            disabled={age <= 0}
          >
            <Minus />
          </Button>
          <Text textAlign="center" w="$6" color={textBlack} fontSize="$5">
            {age} yo
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
              onCheckedChange={() => {
                buttonTap();
                setIsInOfacList(!isInOfacList);
              }}
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
            style={{ opacity: isInOfacList ? 1 : 0 }}
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
          <CustomButton
            onPress={handleGenerate}
            text="Generate passport data"
            Icon={isGenerating ? <Spinner /> : <Cpu color={textBlack} />}
            isDisabled={isGenerating}
          />
        </YStack>
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
          bg={bgWhite}
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
        snapPoints={[40]}
        animation="medium"
        disableDrag
      >
        <Sheet.Overlay />
        <Sheet.Frame
          bg={bgWhite}
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
              {['rsa sha256', 'rsa sha1', 'rsapss sha256'].map(algorithm => (
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
              ))}
            </ScrollView>
          </YStack>
        </Sheet.Frame>
      </Sheet>
    </>
  );
};

export default MockDataScreen;
