// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useState } from 'react';
import { Separator, View, XStack, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { isUserRegisteredWithAlternativeCSCA } from '@selfxyz/common/utils/passports/validate';
import {
  markCurrentDocumentAsRegistered,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import {
  Caption,
  Description,
  PrimaryButton,
  SecondaryButton,
  Title,
} from '@selfxyz/mobile-sdk-alpha/components';
import { BackupEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  black,
  slate500,
  slate600,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import Keyboard from '@/assets/icons/keyboard.svg';
import RestoreAccountSvg from '@/assets/icons/restore_account.svg';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import type { RootStackParamList } from '@/navigation';
import { getPrivateKeyFromMnemonic, useAuth } from '@/providers/authProvider';
import {
  loadPassportData,
  reStorePassportDataWithRightCSCA,
} from '@/providers/passportDataProvider';
import { STORAGE_NAME, useBackupMnemonic } from '@/services/cloud-backup';
import { useSettingStore } from '@/stores/settingStore';
import type { Mnemonic } from '@/types/mnemonic';

const AccountRecoveryChoiceScreen: React.FC = () => {
  const selfClient = useSelfClient();
  const { useProtocolStore } = selfClient;
  const { trackEvent } = useSelfClient();
  const { restoreAccountFromMnemonic } = useAuth();
  // DISABLED FOR NOW: Turnkey functionality
  // const { turnkeyWallets, refreshWallets } = useTurnkeyUtils();
  // const { getMnemonic } = useTurnkeyUtils();
  // const { authState } = useTurnkey();
  const [restoring, setRestoring] = useState(false);
  const { cloudBackupEnabled, toggleCloudBackupEnabled, biometricsAvailable } =
    useSettingStore();
  const { download } = useBackupMnemonic();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // DISABLED FOR NOW: Turnkey functionality
  // const setTurnkeyBackupEnabled = useSettingStore(
  //   state => state.setTurnkeyBackupEnabled,
  // );

  const onRestoreFromCloudNext = useHapticNavigation('AccountVerifiedSuccess');
  const onEnterRecoveryPress = useHapticNavigation('RecoverWithPhrase');

  // DISABLED FOR NOW: Turnkey functionality
  // useEffect(() => {
  //   refreshWallets();
  // }, [refreshWallets]);

  const restoreAccountFlow = useCallback(
    async (
      mnemonic: Mnemonic,
      isCloudRestore: boolean = false,
    ): Promise<boolean> => {
      try {
        const result = await restoreAccountFromMnemonic(mnemonic.phrase);

        if (!result) {
          console.warn('Failed to restore account');
          trackEvent(BackupEvents.CLOUD_RESTORE_FAILED_UNKNOWN);
          navigation.navigate({ name: 'Home', params: {} });
          setRestoring(false);
          return false;
        }

        const passportData = await loadPassportData();
        const secret = getPrivateKeyFromMnemonic(mnemonic.phrase);

        if (!passportData || !secret) {
          console.warn('Failed to load passport data or secret');
          trackEvent(BackupEvents.CLOUD_RESTORE_FAILED_AUTH, {
            reason: 'no_passport_data_or_secret',
          });
          navigation.navigate({ name: 'Home', params: {} });
          setRestoring(false);
          return false;
        }

        const passportDataParsed = JSON.parse(passportData);

        const { isRegistered, csca } =
          await isUserRegisteredWithAlternativeCSCA(
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

                return useProtocolStore.getState()[docCategory]
                  .alternative_csca;
              },
            },
          );
        if (!isRegistered) {
          console.warn(
            'Secret provided did not match a registered ID. Please try again.',
          );
          trackEvent(
            BackupEvents.CLOUD_RESTORE_FAILED_PASSPORT_NOT_REGISTERED,
            {
              reason: 'document_not_registered',
              hasCSCA: !!csca,
            },
          );
          navigation.navigate({ name: 'Home', params: {} });
          setRestoring(false);
          return false;
        }
        if (isCloudRestore && !cloudBackupEnabled) {
          toggleCloudBackupEnabled();
        }
        await reStorePassportDataWithRightCSCA(
          passportDataParsed,
          csca as string,
        );
        await markCurrentDocumentAsRegistered(selfClient);
        trackEvent(BackupEvents.CLOUD_RESTORE_SUCCESS);
        trackEvent(BackupEvents.ACCOUNT_RECOVERY_COMPLETED);
        onRestoreFromCloudNext();
        setRestoring(false);
        return true;
      } catch (e: unknown) {
        console.error(e);
        trackEvent(BackupEvents.CLOUD_RESTORE_FAILED_UNKNOWN);
        setRestoring(false);
        return false;
      }
    },
    [
      trackEvent,
      restoreAccountFromMnemonic,
      cloudBackupEnabled,
      onRestoreFromCloudNext,
      navigation,
      toggleCloudBackupEnabled,
      useProtocolStore,
      selfClient,
    ],
  );

  // DISABLED FOR NOW: Turnkey functionality
  // const onRestoreFromTurnkeyPress = useCallback(async () => {
  //   setRestoring(true);
  //   try {
  //     const mnemonicPhrase = await getMnemonic();
  //     const mnemonic: Mnemonic = {
  //       phrase: mnemonicPhrase,
  //       password: '',
  //       wordlist: {
  //         locale: 'en',
  //       },
  //       entropy: '',
  //     };
  //     const success = await restoreAccountFlow(mnemonic);
  //     if (success) {
  //       setTurnkeyBackupEnabled(true);
  //     }
  //   } catch (error) {
  //     console.error('Turnkey restore error:', error);
  //     trackEvent(BackupEvents.CLOUD_RESTORE_FAILED_UNKNOWN);
  //   } finally {
  //     setRestoring(false);
  //   }
  // }, [getMnemonic, restoreAccountFlow, setTurnkeyBackupEnabled, trackEvent]);

  const onRestoreFromCloudPress = useCallback(async () => {
    setRestoring(true);
    try {
      const mnemonic = await download();
      await restoreAccountFlow(mnemonic, true);
    } catch (error) {
      console.error('Cloud restore error:', error);
      trackEvent(BackupEvents.CLOUD_RESTORE_FAILED_UNKNOWN);
      setRestoring(false);
    }
  }, [download, restoreAccountFlow, trackEvent]);

  const handleManualRecoveryPress = useCallback(() => {
    onEnterRecoveryPress();
  }, [onEnterRecoveryPress]);

  return (
    <ExpandableBottomLayout.Layout backgroundColor={black}>
      <ExpandableBottomLayout.TopSection backgroundColor={black}>
        <View
          borderColor={slate600}
          borderWidth="$1"
          borderRadius="$10"
          padding="$5"
        >
          <RestoreAccountSvg height={80} width={80} color={white} />
        </View>
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection backgroundColor={white}>
        <YStack alignItems="center" gap="$2.5" paddingBottom="$2.5">
          <Title>Restore your Self account</Title>
          <Description>
            By continuing, you certify that this passport belongs to you and is
            not stolen or forged.{' '}
            {!biometricsAvailable && (
              <>
                Your device doesn't support biometrics or is disabled for apps
                and is required for cloud storage.
              </>
            )}
          </Description>

          <YStack gap="$2.5" width="100%" paddingTop="$6">
            {/* DISABLED FOR NOW: Turnkey functionality */}
            {/* <PrimaryButton
              trackEvent={BackupEvents.CLOUD_BACKUP_STARTED}
              onPress={onRestoreFromTurnkeyPress}
              testID="button-from-turnkey"
              disabled={
                restoring ||
                !biometricsAvailable ||
                (authState === AuthState.Authenticated &&
                  turnkeyWallets.length === 0)
              }
            >
              {restoring ? 'Restoring' : 'Restore'} from Turnkey
              {restoring ? '…' : ''}
            </PrimaryButton> */}
            <PrimaryButton
              trackEvent={BackupEvents.CLOUD_BACKUP_STARTED}
              onPress={onRestoreFromCloudPress}
              testID="button-from-teststorage"
              disabled={restoring || !biometricsAvailable}
            >
              {restoring ? 'Restoring' : 'Restore'} from {STORAGE_NAME}
              {restoring ? '…' : ''}
            </PrimaryButton>
            <XStack gap={64} alignItems="center" justifyContent="space-between">
              <Separator flexGrow={1} />
              <Caption>OR</Caption>
              <Separator flexGrow={1} />
            </XStack>
            <SecondaryButton
              trackEvent={BackupEvents.MANUAL_RECOVERY_SELECTED}
              onPress={handleManualRecoveryPress}
              disabled={restoring}
            >
              <XStack alignItems="center" justifyContent="center">
                <Keyboard height={25} width={40} color={slate500} />
                <View paddingLeft={12}>
                  <Description>Enter recovery phrase</Description>
                </View>
              </XStack>
            </SecondaryButton>
          </YStack>
        </YStack>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default AccountRecoveryChoiceScreen;
