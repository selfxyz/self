import React, { useCallback, useState } from 'react';
import { Keyboard, StyleSheet } from 'react-native';

import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation } from '@react-navigation/native';
import { ethers } from 'ethers';
import { Text, TextArea, View, XStack, YStack } from 'tamagui';

import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import Description from '../../components/typography/Description';
import Paste from '../../images/icons/paste.svg';
import { usePassport } from '../../stores/passportDataProvider';
import {
  black,
  slate300,
  slate400,
  slate600,
  slate700,
  white,
} from '../../utils/colors';
import { isUserRegistered } from '../../utils/proving/payload';

interface RecoverWithPhraseScreenProps {}

const RecoverWithPhraseScreen: React.FC<
  RecoverWithPhraseScreenProps
> = ({}) => {
  const navigation = useNavigation();
  const { restorefromSecret, passportData, status } = usePassport();
  const [mnemonic, setMnemonic] = useState<string>();
  const [restoring, setRestoring] = useState(false);
  const onPaste = useCallback(async () => {
    const clipboard = (await Clipboard.getString()).trim();
    if (ethers.Mnemonic.isValidMnemonic(clipboard)) {
      setMnemonic(clipboard);
      Keyboard.dismiss();
    }
  }, []);

  const restoreAccount = useCallback(async () => {
    if (status !== 'success') {
      return;
    }
    setRestoring(true);
    const slimMnemonic = mnemonic?.trim();
    if (!slimMnemonic || !ethers.Mnemonic.isValidMnemonic(slimMnemonic)) {
      console.log('Invalid mnemonic');
      setRestoring(false);
      return;
    }

    try {
      const secret = await restorefromSecret(slimMnemonic);
      if (!passportData || !secret) {
        console.warn('Secret or passport data is missing');
        navigation.navigate('Launch');
        setRestoring(false);
        return;
      }

      const isRegistered = await isUserRegistered(
        passportData,
        secret.password,
      );
      console.log('User is registered:', isRegistered);
      if (!isRegistered) {
        console.log(
          'Secret provided did not match a registered passport. Please try again.',
        );
        navigation.navigate('Launch');
        setRestoring(false);
        return;
      }

      setRestoring(false);
      navigation.navigate('AccountVerifiedSuccess');
    } catch (error) {
      console.warn('Failed to restore account');
      navigation.navigate('Launch');
      setRestoring(false);
      return;
    }
  }, [mnemonic, restorefromSecret, navigation, passportData, status]);

  return (
    <YStack alignItems="center" gap="$6" pb="$2.5" style={styles.layout}>
      <Description color={slate300}>
        Your recovery phrase has 24 words. Enter the words in the correct order,
        separated by spaces.
      </Description>
      <View width="100%" position="relative">
        <TextArea
          borderColor={slate600}
          backgroundColor={slate700}
          color={slate400}
          borderWidth="$1"
          borderRadius="$5"
          placeholder="Enter or paste your recovery phrase"
          width="100%"
          minHeight={230}
          verticalAlign="top"
          value={mnemonic}
          onKeyPress={key =>
            key.nativeEvent.key === 'Enter' && mnemonic && Keyboard.dismiss()
          }
          onChangeText={setMnemonic}
        />
        <XStack
          gap="$2"
          position="absolute"
          bottom={0}
          width="100%"
          alignItems="flex-end"
          justifyContent="center"
          pb="$4"
          onPress={onPaste}
        >
          <Paste color={white} height={20} width={20} />
          <Text style={styles.pasteText}>PASTE</Text>
        </XStack>
      </View>

      <SecondaryButton
        disabled={!mnemonic || restoring}
        onPress={restoreAccount}
      >
        Continue
      </SecondaryButton>
    </YStack>
  );
};

export default RecoverWithPhraseScreen;

const styles = StyleSheet.create({
  layout: {
    paddingTop: 30,
    paddingLeft: 20,
    paddingRight: 20,
    backgroundColor: black,
    height: '100%',
  },
  pasteText: {
    lineHeight: 20,
    fontSize: 15,
    color: white,
  },
});
