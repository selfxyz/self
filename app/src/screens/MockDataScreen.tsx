import React, { useCallback, useState } from 'react';

import { ChevronDown, Cpu, Minus, Plus } from '@tamagui/lucide-icons';
import {
  Button,
  Fieldset,
  Spinner,
  Switch,
  Text,
  XStack,
  YStack,
} from 'tamagui';

import { flag } from 'country-emoji';
import getCountryISO2 from 'country-iso-3-to-2';

import { countryCodes } from '../../../common/src/constants/constants';
import { genMockPassportData } from '../../../common/src/utils/genMockPassportData';
import CustomButton from '../components/CustomButton';
import useNavigationStore from '../stores/navigationStore';
import useUserStore from '../stores/userStore';
import { borderColor, textBlack } from '../utils/colors';

interface MockDataScreenProps {
  onCountryPress: () => void;
  onAlgorithmPress: () => void;
  selectedCountry: string;
  selectedAlgorithm: string;
}

const MockDataScreen: React.FC<MockDataScreenProps> = ({
  onCountryPress,
  onAlgorithmPress,
  selectedCountry,
  selectedAlgorithm,
}) => {
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

  const { toast } = useNavigationStore();
  const signatureAlgorithmToStrictSignatureAlgorithm = {
    'rsa sha256': 'rsa_sha256_65537_2048',
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
        const hashAlgo = selectedAlgorithm === 'rsa sha1' ? 'sha1' : 'sha256';
        const mockPassportData = genMockPassportData(
          hashAlgo,
          hashAlgo,
          signatureAlgorithmToStrictSignatureAlgorithm[
            selectedAlgorithm as keyof typeof signatureAlgorithmToStrictSignatureAlgorithm
          ],
          selectedCountry as keyof typeof countryCodes,
          castDate(-age),
          castDate(expiryYears),
          randomPassportNumber,
          ...(isInOfacList ? ['HENAO MONTOYA', 'ARCANGEL DE JESUS'] : []),
        );
        useUserStore.getState().registerPassportData(mockPassportData);
        useUserStore.getState().setRegistered(true);
        resolve(null);
      }, 0),
    );

    toast.show('🤖', {
      message: 'Passport generated',
      customData: {
        type: 'success',
      },
    });

    await new Promise(resolve => setTimeout(resolve, 1000));
    useNavigationStore.getState().setSelectedTab('next');
  }, [selectedAlgorithm, selectedCountry, age, expiryYears, isInOfacList]);

  return (
    <YStack f={1} gap="$4">
      <Text my="$9" textAlign="center" fontSize="$9" color={textBlack}>
        Generate passport data
      </Text>
      <XStack ai="center">
        <Text f={1} fontSize="$5">
          Encryption
        </Text>
        <Button
          onPress={onAlgorithmPress}
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
          onPress={onCountryPress}
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
          onPress={() => setAge(age - 1)}
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
          onPress={() => setAge(age + 1)}
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
          onPress={() => setExpiryYears(expiryYears - 1)}
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
          onPress={() => setExpiryYears(expiryYears + 1)}
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
            onCheckedChange={() => setIsInOfacList(!isInOfacList)}
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
  );
};

export default MockDataScreen;
