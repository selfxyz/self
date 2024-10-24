import React, { useState, useCallback, useMemo } from 'react';
import { YStack, XStack, Text, Select, Adapt, Sheet, Fieldset, Button, Spinner } from 'tamagui';
import { CalendarSearch, Check, ChevronDown, ChevronUp, Cpu, Minus, Plus } from '@tamagui/lucide-icons';
import { bgGreen, borderColor, textBlack } from '../utils/colors';
import useUserStore from '../stores/userStore';
import useNavigationStore from '../stores/navigationStore';
import CustomButton from '../components/CustomButton';
import { genMockPassportData } from '../../../common/src/utils/genMockPassportData';
import { countryCodes } from '../../../common/src/constants/constants';
import getCountryISO2 from "country-iso-3-to-2";
import { flag } from 'country-emoji';

const MockDataScreen: React.FC = () => {
  const [signatureAlgorithm, setSignatureAlgorithm] = useState("rsa_sha256");
  const listOfSignatureAlgorithms = ["rsa_sha1", "rsa_sha256", "rsapss_sha256"];

  const [age, setAge] = useState(24);
  const [expiryYears, setExpiryYears] = useState(5);
  const [nationality, setNationality] = useState("FRA");
  const [isGenerating, setIsGenerating] = useState(false);

  const castDate = (yearsOffset: number) => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + yearsOffset);
    return (date.toISOString().slice(2, 4) + date.toISOString().slice(5, 7) + date.toISOString().slice(8, 10)).toString();
  };

  const { toast } = useNavigationStore();

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);

    await new Promise(resolve => setTimeout(() => {
      const mockPassportData = genMockPassportData(
        signatureAlgorithm as "rsa_sha256" | "rsa_sha1" | "rsapss_sha256",
        nationality as keyof typeof countryCodes,
        castDate(-age),
        castDate(expiryYears)
      );
      useUserStore.getState().registerPassportData(mockPassportData);
      useUserStore.getState().setRegistered(true);
      resolve(null);
    }, 0));

    toast.show("🤖", {
      message: "Passport generated",
      customData: {
        type: "success",
      },
    });

    await new Promise(resolve => setTimeout(resolve, 1000));
    useNavigationStore.getState().setSelectedTab("next");
  }, [signatureAlgorithm, nationality, age, expiryYears]);
  const countryOptions = useMemo(() => {
    return Object.keys(countryCodes).map((countryCode, index) => ({
      countryCode,
      countryName: countryCodes[countryCode as keyof typeof countryCodes],
      flagEmoji: flag(getCountryISO2(countryCode)),
      index,
    }));
  }, []);
  return (
    <YStack f={1} gap="$4" >
      <Text my="$9" textAlign="center" fontSize="$9" color={textBlack}>Generate passport data</Text>
      <XStack ai="center" >
        <Text f={1}>
          Encryption
        </Text>
        <Select
          id="signature-algorithm"
          value={signatureAlgorithm}
          onValueChange={setSignatureAlgorithm}
          native
        >
          <Select.Trigger w="$16" iconAfter={ChevronDown}>
            <Select.Value placeholder="Select algorithm" />
          </Select.Trigger>

          <Adapt when="sm" platform="touch">
            <Sheet
              modal
              dismissOnSnapToBottom
              animationConfig={{
                type: 'spring',
                damping: 20,
                mass: 1.2,
                stiffness: 250,
              }}
            >
              <Sheet.Frame>
                <Text fontSize="$8" p="$3">Encryption method</Text>
                <Sheet.ScrollView>
                  <Adapt.Contents />
                </Sheet.ScrollView>
              </Sheet.Frame>
              <Sheet.Overlay
                animation="lazy"
                enterStyle={{ opacity: 0 }}
                exitStyle={{ opacity: 0 }}
              />
            </Sheet>
          </Adapt>

          <Select.Content zIndex={200000}>
            <Select.ScrollUpButton ai="center" jc="center" pos="relative" w="100%" h="$3">
              <ChevronUp size={20} />
            </Select.ScrollUpButton>

            <Select.Viewport minWidth={200}>
              <Select.Group>
                {listOfSignatureAlgorithms.map((algorithm, index) => (
                  <Select.Item key={algorithm} index={index} value={algorithm}>
                    <Select.ItemText >{algorithm}</Select.ItemText>
                    <Select.ItemIndicator marginLeft="auto">
                      <Check size={16} />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Group>
            </Select.Viewport>

            <Select.ScrollDownButton ai="center" jc="center" pos="relative" w="100%" h="$3">
              <ChevronDown size={20} />
            </Select.ScrollDownButton>
          </Select.Content>
        </Select>
      </XStack>


      <XStack ai="center" gap="$2">
        <Text f={1} >
          Nationality
        </Text>
        <Select
          id="nationality"
          value={nationality}
          onValueChange={setNationality}
          native
        >
          <Select.Trigger width="$16" iconAfter={ChevronDown}>
            <Select.Value placeholder="Select algorithm" />
          </Select.Trigger>

          <Adapt when="sm" platform="touch">
            <Sheet
              modal
              dismissOnSnapToBottom
              animationConfig={{
                type: 'spring',
                damping: 20,
                mass: 1.2,
                stiffness: 250,
              }}
            >
              <Sheet.Frame >
                <Text fontSize="$8" p="$3">Nationality</Text>
                <Sheet.ScrollView>
                  <Adapt.Contents />
                </Sheet.ScrollView>
              </Sheet.Frame>
              <Sheet.Overlay
                animation="lazy"
                enterStyle={{ opacity: 0 }}
                exitStyle={{ opacity: 0 }}
              />
            </Sheet>
          </Adapt>

          <Select.Content zIndex={200000}>
            <Select.ScrollUpButton ai="center" jc="center" pos="relative" w="100%" h="$3">
              <ChevronUp size={20} />
            </Select.ScrollUpButton>

            <Select.Viewport minWidth={200}>
              <Select.Group>
                {countryOptions.map(({ countryCode, countryName, flagEmoji, index }) => (
                  <Select.Item key={countryCode} index={index} value={countryCode}>
                    <Select.ItemText>{countryName} {flagEmoji}</Select.ItemText>
                    <Select.ItemIndicator marginLeft="auto">
                      <Check size={16} />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Group>
            </Select.Viewport>

            <Select.ScrollDownButton ai="center" jc="center" pos="relative" w="100%" h="$3">
              <ChevronDown size={20} />
            </Select.ScrollDownButton>
          </Select.Content>
        </Select>
      </XStack>



      <Fieldset mt="$2" gap="$2" horizontal>
        <Text color={textBlack} width={160} justifyContent="flex-end" fontSize="$5">
          Age (🎂)
        </Text>
        <XStack f={1} />

        <Button h="$3.5" w="$3.5" bg="white" jc="center" borderColor={borderColor} borderWidth={1} borderRadius="$10" onPress={() => setAge(age - 1)} disabled={age <= 0}>
          <Minus />
        </Button>
        <Text textAlign='center' w="$6" color={textBlack} fontSize="$5">
          {age} yo
        </Text>
        <Button h="$3.5" w="$3.5" bg="white" jc="center" borderColor={borderColor} borderWidth={1} borderRadius="$10" onPress={() => setAge(age + 1)}>
          <Plus />
        </Button>
      </Fieldset>

      <Fieldset gap="$2" horizontal>
        <Text color={textBlack} width={160} justifyContent="flex-end" fontSize="$5">
          Passport expires in
        </Text>
        <XStack f={1} />

        <Button h="$3.5" w="$3.5" bg="white" jc="center" borderColor={borderColor} borderWidth={1} borderRadius="$10" onPress={() => setExpiryYears(expiryYears - 1)} disabled={expiryYears <= 0}>
          <Minus />
        </Button>
        <Text textAlign='center' w="$6" color={textBlack} fontSize="$5">
          {expiryYears} years
        </Text>
        <Button h="$3.5" w="$3.5" bg="white" jc="center" borderColor={borderColor} borderWidth={1} borderRadius="$10" onPress={() => setExpiryYears(expiryYears + 1)}>
          <Plus />
        </Button>
      </Fieldset>

      <YStack f={1} />
      <YStack >
        <Text mb="$2" textAlign="center" fontSize="$4" color={textBlack}>
          These passport data are only for testing purposes.
        </Text>
        <CustomButton onPress={handleGenerate} text="Generate passport data" Icon={isGenerating ? <Spinner /> : <Cpu color={textBlack} />} isDisabled={isGenerating} />
      </YStack>
    </YStack>
  );
};

export default MockDataScreen;
