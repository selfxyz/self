import React from 'react';

import { useNavigation } from '@react-navigation/native';
import { Check, ChevronDown, Eraser, IterationCw } from '@tamagui/lucide-icons';
import { Adapt, Button, Fieldset, Label, Select, Sheet, YStack } from 'tamagui';

import { RootStackParamList } from '../../Navigation';
import useUserStore from '../../stores/userStore';
import { borderColor, textBlack } from '../../utils/colors';

interface DevSettingsScreenProps {}

const items: (keyof RootStackParamList)[] = [
  'DevSettings',
  'Splash',
  'Launch',
  'Start',
  'PassportOnboarding',
  'PassportCamera',
  'PassportNFCScan',
  'PassportDataInfo',
  'LoadingScreen',
  'AccountVerifiedSuccess',
  'ConfirmBelongingScreen',
  'CreateMock',
  'NextScreen',
  'Home',
  'Disclaimer',
  'QRCodeViewFinder',
  'ProveScreen',
  'ProofRequestStatusScreen',
  'Settings',
  'AccountRecovery',
  'SaveRecoveryPhrase',
  'RecoverWithPhrase',
  'AccountVerifiedSuccess',
  'ShowRecoveryPhrase',
  'CloudBackupSettings',
];
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
  const {
    clearPassportDataFromStorage,
    clearPassportMetadataFromStorage,
    setRegistered,
  } = useUserStore();

  const nav = useNavigation();

  function handleRestart() {
    clearPassportMetadataFromStorage();
    clearPassportDataFromStorage();
    setRegistered(false);
    nav.navigate('Launch');
  }

  return (
    <YStack gap="$2" mt="$2" ai="center">
      <Fieldset gap="$4" horizontal>
        <Label
          color={textBlack}
          width={200}
          justifyContent="flex-end"
          htmlFor="restart"
        >
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

      <Fieldset gap="$4" mt="$1" horizontal marginBottom={30}>
        <Label
          color={textBlack}
          width={200}
          justifyContent="flex-end"
          htmlFor="skip"
        >
          Delete passport data
        </Label>
        <Button
          bg="white"
          jc="center"
          borderColor={borderColor}
          borderWidth={1.2}
          size="$3.5"
          ml="$2"
          // onPress={}
        >
          <Eraser color={textBlack} />
        </Button>
      </Fieldset>

      {/* <Fieldset gap="$4" mt="$1" horizontal>
                        <Label color={textBlack} width={200} justifyContent="flex-end" htmlFor="skip" >
                          Delete proofs
                        </Label>
                        <Button bg="white" jc="center" borderColor={borderColor} borderWidth={1.2} size="$3.5" ml="$2" onPress={clearProofsFromStorage}>
                          <Eraser color={textBlack} />
                        </Button>
                      </Fieldset> */}

      {/* <Fieldset horizontal>
                    <Label color={textBlack} width={225} justifyContent="flex-end" htmlFor="restart" >
                      Private mode
                    </Label>
                    <Switch size="$3.5" checked={hideData} onCheckedChange={handleHideData}>
                      <Switch.Thumb animation="bouncy" bc={bgColor} />
                    </Switch>
                  </Fieldset> */}

      {/* <Fieldset gap="$4" mt="$1" horizontal>
        <Label
          color={textBlack}
          width={200}
          justifyContent="flex-end"
          htmlFor="skip"
        >
          Delete secret (caution)
        </Label>
        <Button
          bg="white"
          jc="center"
          borderColor={borderColor}
          borderWidth={1.2}
          size="$3.5"
          ml="$2"
          // onPress={clearSecretFromStorage}
        >
          <Eraser color={textColor2} />
        </Button>
      </Fieldset> */}
      {/* <Dialog.Container visible={false}>
        <Dialog.Title>Delete Secret</Dialog.Title>
        <Dialog.Description>
          You are about to delete your secret. Be careful! You will not be able
          to recover your identity.
        </Dialog.Description>
        <Dialog.Button
          //   onPress={() => setDialogDeleteSecretIsOpen(false)}
          label="Cancel"
        />
        <Dialog.Button
          //   onPress={() => handleDeleteSecret()}
          label="Delete secret"
        />
      </Dialog.Container> */}
      {/* <Fieldset gap="$4" mt="$1" horizontal>
                        <Label color={textBlack} width={200} justifyContent="flex-end" htmlFor="skip" >
                          registered = (!registered)
                        </Label>
                        <Button bg="white" jc="center" borderColor={borderColor} borderWidth={1.2} size="$3.5" ml="$2" onPress={() => setRegistered(!registered)}>
                          <UserPlus color={textColor2} />
                        </Button>
                      </Fieldset> */}

      <Fieldset marginTop={30} gap="$4" mt="$1" horizontal>
        <Label color={textBlack} justifyContent="flex-end" htmlFor="skip">
          Shortcut
        </Label>
        <ScreenSelector />
      </Fieldset>
    </YStack>
  );
};

export default DevSettingsScreen;
