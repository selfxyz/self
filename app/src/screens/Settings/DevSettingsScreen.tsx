import React, { PropsWithChildren, useEffect, useState } from 'react';
import { Platform, TextInput } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import {
  Check,
  ChevronDown,
  Eraser,
  IterationCw,
  VenetianMask,
} from '@tamagui/lucide-icons';
import {
  Adapt,
  Button,
  Fieldset,
  Label,
  Select,
  Sheet,
  Text,
  YStack,
} from 'tamagui';

import { genMockPassportData } from '../../../../common/src/utils/passports/genMockPassportData';
import { RootStackParamList } from '../../Navigation';
import {
  unsafe_clearSecrets,
  unsafe_getPrivateKey,
} from '../../stores/authProvider';
import {
  storePassportData,
  usePassport,
} from '../../stores/passportDataProvider';
import { borderColor, textBlack } from '../../utils/colors';

interface DevSettingsScreenProps {}

function SelectableText({ children, ...props }: PropsWithChildren) {
  if (Platform.OS === 'ios') {
    return (
      <TextInput multiline editable={false} {...props}>
        {children}
      </TextInput>
    );
  } else {
    return (
      <Text selectable {...props}>
        {children}
      </Text>
    );
  }
}

const items = [
  'DevSettings',
  'Splash',
  'Launch',
  'PassportOnboarding',
  'PassportCamera',
  'PassportNFCScan',
  'PassportDataInfo',
  'LoadingScreen',
  'AccountVerifiedSuccess',
  'ConfirmBelongingScreen',
  'CreateMock',
  'Home',
  'Disclaimer',
  'QRCodeViewFinder',
  'ProveScreen',
  'ProofRequestStatusScreen',
  'Settings',
  'AccountRecovery',
  'SaveRecoveryPhrase',
  'RecoverWithPhrase',
  'ShowRecoveryPhrase',
  'CloudBackupSettings',
  'UnsupportedPassport',
  'PassportCameraTrouble',
  'PassportNFCTrouble',
] satisfies (keyof RootStackParamList)[];
const ScreenSelector = ({}) => {
  const navigation = useNavigation();
  return (
    <Select
      onValueChange={screen => {
        // @ts-expect-error - weird typing?
        navigation.navigate(screen);
      }}
      disablePreventBodyScroll
    >
      <Select.Trigger width={220} iconAfter={ChevronDown}>
        <Select.Value placeholder="Select screen to debug" />
      </Select.Trigger>

      <Adapt when="sm" platform="touch">
        <Sheet native modal dismissOnSnapToBottom animation="medium">
          <Sheet.Frame>
            <Sheet.ScrollView>
              <Adapt.Contents />
            </Sheet.ScrollView>
          </Sheet.Frame>
          <Sheet.Overlay
            backgroundColor="$shadowColor"
            animation="lazy"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />
        </Sheet>
      </Adapt>

      <Select.Content zIndex={200000}>
        <Select.Viewport minWidth={200}>
          <Select.Group>
            {React.useMemo(
              () =>
                items.map((item, i) => {
                  return (
                    <Select.Item index={i} key={item} value={item}>
                      <Select.ItemText>{item}</Select.ItemText>
                      <Select.ItemIndicator marginLeft="auto">
                        <Check size={16} />
                      </Select.ItemIndicator>
                    </Select.Item>
                  );
                }),
              [items],
            )}
          </Select.Group>
        </Select.Viewport>
      </Select.Content>
    </Select>
  );
};

const DevSettingsScreen: React.FC<DevSettingsScreenProps> = ({}) => {
  const { clearPassportData } = usePassport();
  const [privateKey, setPrivateKey] = useState('Loading private key…');

  const nav = useNavigation();

  async function handleRestart() {
    await clearPassportData();
    nav.navigate('Launch');
  }

  async function deleteEverything() {
    await unsafe_clearSecrets();
    await handleRestart();
  }

  function handleGenerateMockPassportData() {
    const passportData = genMockPassportData(
      'sha256',
      'sha256',
      'rsa_sha256_65537_2048',
      'FRA',
      '000101',
      '300101',
    );
    storePassportData(passportData);
  }

  useEffect(() => {
    unsafe_getPrivateKey().then(setPrivateKey);
  }, []);

  return (
    <YStack gap="$3" mt="$2" ai="center">
      <Fieldset px="$4" horizontal width="100%" justifyContent="space-between">
        <Label color={textBlack} width={200} justifyContent="flex-end">
          Rescan passport
        </Label>
        <Button
          bg="white"
          jc="center"
          borderColor={borderColor}
          borderWidth={1.2}
          size="$3.5"
          ml="$2"
          onPress={handleRestart}
        >
          <IterationCw color={textBlack} />
        </Button>
      </Fieldset>
      <Fieldset px="$4" horizontal width="100%" justifyContent="space-between">
        <Label color={textBlack} width={200} justifyContent="flex-end">
          Generate mock passport data
        </Label>
        <Button
          bg="white"
          jc="center"
          borderColor={borderColor}
          borderWidth={1.2}
          size="$3.5"
          ml="$2"
          onPress={handleGenerateMockPassportData}
        >
          <VenetianMask color={textBlack} />
        </Button>
      </Fieldset>

      <Fieldset px="$4" horizontal width="100%" justifyContent="space-between">
        <Label color={textBlack} width={200} justifyContent="flex-end">
          Delete passport data
        </Label>
        <Button
          bg="white"
          jc="center"
          borderColor={borderColor}
          borderWidth={1.2}
          size="$3.5"
          ml="$2"
          onPress={clearPassportData}
        >
          <Eraser color={textBlack} />
        </Button>
      </Fieldset>
      <Fieldset px="$4" horizontal width="100%" justifyContent="space-between">
        <Label color={textBlack} width={200} justifyContent="flex-end">
          Delete keychain secrets
        </Label>
        <Button
          bg="white"
          jc="center"
          borderColor={borderColor}
          borderWidth={1.2}
          size="$3.5"
          ml="$2"
          onPress={unsafe_clearSecrets}
        >
          <Eraser color={textBlack} />
        </Button>
      </Fieldset>

      <Fieldset px="$4" horizontal width="100%" justifyContent="space-between">
        <Label color={textBlack} width={200} justifyContent="flex-end">
          Delete everything
        </Label>
        <Button
          bg="white"
          jc="center"
          borderColor={borderColor}
          borderWidth={1.2}
          size="$3.5"
          ml="$2"
          onPress={deleteEverything}
        >
          <Eraser color={textBlack} />
        </Button>
      </Fieldset>

      <Fieldset px="$4" horizontal width="100%" justifyContent="space-between">
        <Label color={textBlack} justifyContent="flex-end">
          Shortcuts
        </Label>
        <ScreenSelector />
      </Fieldset>

      <Fieldset px="$4" width="100%" mt={30} justifyContent="space-between">
        <Label color={textBlack} width={200} justifyContent="flex-end">
          Private key
        </Label>
        <SelectableText
          color={textBlack}
          width={300}
          justifyContent="flex-end"
          userSelect="all"
          style={{ fontFamily: 'monospace', fontWeight: 'bold' }}
        >
          {privateKey}
        </SelectableText>
      </Fieldset>
    </YStack>
  );
};

export default DevSettingsScreen;
