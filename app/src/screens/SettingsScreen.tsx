import React from 'react';
import Dialog from 'react-native-dialog';

import { Eraser, IterationCw } from '@tamagui/lucide-icons';
import { Button, Fieldset, Label, YStack } from 'tamagui';

import { borderColor, textBlack, textColor2 } from '../utils/colors';

interface SettingsScreenProps {}

const SettingsScreen: React.FC<SettingsScreenProps> = ({}) => {
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
          //   onPress={handleRestart}
        >
          <IterationCw color={textBlack} />
        </Button>
      </Fieldset>

      <Fieldset gap="$4" mt="$1" horizontal>
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
          //   onPress={clearPassportDataFromStorage}
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

      <Fieldset gap="$4" mt="$1" horizontal>
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
          //   onPress={() => setDialogDeleteSecretIsOpen(true)}
        >
          <Eraser color={textColor2} />
        </Button>
      </Fieldset>
      <Dialog.Container visible={false}>
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
      </Dialog.Container>
      {/* <Fieldset gap="$4" mt="$1" horizontal>
                        <Label color={textBlack} width={200} justifyContent="flex-end" htmlFor="skip" >
                          registered = (!registered)
                        </Label>
                        <Button bg="white" jc="center" borderColor={borderColor} borderWidth={1.2} size="$3.5" ml="$2" onPress={() => setRegistered(!registered)}>
                          <UserPlus color={textColor2} />
                        </Button>
                      </Fieldset> */}
    </YStack>
  );
};

export default SettingsScreen;
