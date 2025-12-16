// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { ethers } from 'ethers';
import React, { useCallback, useState } from 'react';
import { Keyboard, StyleSheet } from 'react-native';
import { Text, TextArea, View, XStack, YStack } from 'tamagui';
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { isUserRegisteredWithAlternativeCSCA } from '@selfxyz/common/utils/passports/validate';
import {
  markCurrentDocumentAsRegistered,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import {
  Description,
  SecondaryButton,
} from '@selfxyz/mobile-sdk-alpha/components';
import { BackupEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  black,
  slate300,
  slate400,
  slate600,
  slate700,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import Paste from '@/assets/icons/paste.svg';
import type { RootStackParamList } from '@/navigation';
import { getPrivateKeyFromMnemonic, useAuth } from '@/providers/authProvider';
import {
  loadPassportData,
  reStorePassportDataWithRightCSCA,
} from '@/providers/passportDataProvider';

const RecoverWithPhraseScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const selfClient = useSelfClient();
  const { useProtocolStore } = selfClient;
  const { restoreAccountFromMnemonic } = useAuth();
  const { trackEvent } = useSelfClient();
  const [mnemonic, setMnemonic] = useState<string>();
  const [restoring, setRestoring] = useState(false);
  const onPaste = useCallback(async () => {
    const clipboard = (await Clipboard.getString()).trim();
    // bugfix: perform a simple clipboard check; ethers.Mnemonic.isValidMnemonic doesn't work
    if (clipboard) {
      setMnemonic(clipboard);
      Keyboard.dismiss();
    }
  }, []);

  const restoreAccount = useCallback(async () => {
    try {
      setRestoring(true);
      const slimMnemonic = mnemonic?.trim();
      if (!slimMnemonic || !ethers.Mnemonic.isValidMnemonic(slimMnemonic)) {
        setRestoring(false);
        return;
      }
      const result = await restoreAccountFromMnemonic(slimMnemonic);

      if (!result) {
        console.warn('Failed to restore account');
        trackEvent(BackupEvents.CLOUD_RESTORE_FAILED_AUTH, {
          mnemonicLength: slimMnemonic.split(' ').length,
        });
        navigation.navigate({ name: 'Home', params: {} });
        setRestoring(false);
        return;
      }

      const passportData = await loadPassportData();
      const secret = getPrivateKeyFromMnemonic(slimMnemonic);

      if (!passportData || !secret) {
        console.warn(
          'No passport data found on device. Please scan or import your document.',
        );
        trackEvent(BackupEvents.CLOUD_RESTORE_FAILED_AUTH, {
          reason: 'no_passport_data',
        });
        navigation.navigate({ name: 'Home', params: {} });
        setRestoring(false);
        return;
      }
      const passportDataParsed = JSON.parse(passportData);

      const { isRegistered, csca } = await isUserRegisteredWithAlternativeCSCA(
        passportDataParsed,
        secret as string,
        {
          getCommitmentTree(docCategory) {
            return useProtocolStore.getState()[docCategory].commitment_tree;
          },
          getAltCSCA(docCategory) {
            if (docCategory === 'aadhaar') {
              const publicKeys =
                useProtocolStore.getState().aadhaar.public_keys;
              // Convert string[] to Record<string, string> format expected by AlternativeCSCA
              return publicKeys
                ? Object.fromEntries(publicKeys.map(key => [key, key]))
                : {};
            }

            return useProtocolStore.getState()[docCategory].alternative_csca;
          },
        },
      );
      if (!isRegistered) {
        console.warn(
          'Secret provided did not match a registered passport. Please try again.',
        );
        trackEvent(BackupEvents.CLOUD_RESTORE_FAILED_PASSPORT_NOT_REGISTERED, {
          reason: 'document_not_registered',
          hasCSCA: !!csca,
        });
        navigation.navigate({ name: 'Home', params: {} });
        setRestoring(false);
        return;
      }

      if (csca) {
        await reStorePassportDataWithRightCSCA(passportDataParsed, csca);
      }

      await markCurrentDocumentAsRegistered(selfClient);
      setRestoring(false);
      trackEvent(BackupEvents.ACCOUNT_RECOVERY_COMPLETED);
      navigation.navigate('AccountVerifiedSuccess');
    } catch (error) {
      trackEvent(BackupEvents.CLOUD_RESTORE_FAILED_UNKNOWN, {
        reason: 'unexpected_error',
        error: error instanceof Error ? error.message : 'unknown',
      });
      setRestoring(false);
      navigation.navigate({ name: 'Home', params: {} });
    }
  }, [
    mnemonic,
    navigation,
    restoreAccountFromMnemonic,
    selfClient,
    trackEvent,
    useProtocolStore,
  ]);

  return (
    <YStack
      alignItems="center"
      gap="$6"
      paddingBottom="$2.5"
      style={styles.layout}
    >
      <Description style={{ color: slate300 }}>
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
          paddingBottom="$4"
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
