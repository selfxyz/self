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

import useHapticNavigation from '@/hooks/useHapticNavigation';
import Keyboard from '@/images/icons/keyboard.svg';
import RestoreAccountSvg from '@/images/icons/restore_account.svg';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import type { RootStackParamList } from '@/navigation';
import { useAuth } from '@/providers/authProvider';
import {
  loadPassportDataAndSecret,
  reStorePassportDataWithRightCSCA,
} from '@/providers/passportDataProvider';
import { useSettingStore } from '@/stores/settingStore';
import { STORAGE_NAME, useBackupMnemonic } from '@/utils/cloudBackup';
import { black, slate500, slate600, white } from '@/utils/colors';

const AccountRecoveryChoiceScreen: React.FC = () => {
  const selfClient = useSelfClient();
  const { useProtocolStore } = selfClient;
  const { trackEvent } = useSelfClient();
  const { restoreAccountFromMnemonic } = useAuth();
  const [restoring, setRestoring] = useState(false);
  const { cloudBackupEnabled, toggleCloudBackupEnabled, biometricsAvailable } =
    useSettingStore();
  const { download } = useBackupMnemonic();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const onRestoreFromCloudNext = useHapticNavigation('AccountVerifiedSuccess');
  const onEnterRecoveryPress = useHapticNavigation('RecoverWithPhrase');

  const onRestoreFromCloudPress = useCallback(async () => {
    setRestoring(true);
    try {
      const mnemonic = await download();
      const result = await restoreAccountFromMnemonic(mnemonic.phrase);

      if (!result) {
        console.warn('Failed to restore account');
        trackEvent(BackupEvents.CLOUD_RESTORE_FAILED_UNKNOWN);
        navigation.navigate('Launch');
        setRestoring(false);
        return;
      }

      const passportDataAndSecret =
        (await loadPassportDataAndSecret()) as string;
      const { passportData, secret } = JSON.parse(passportDataAndSecret);
      const { isRegistered, csca } = await isUserRegisteredWithAlternativeCSCA(
        passportData,
        secret,
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
          'Secret provided did not match a registered ID. Please try again.',
        );
        trackEvent(BackupEvents.CLOUD_RESTORE_FAILED_PASSPORT_NOT_REGISTERED);
        navigation.navigate('Launch');
        setRestoring(false);
        return;
      }
      if (!cloudBackupEnabled) {
        toggleCloudBackupEnabled();
      }
      reStorePassportDataWithRightCSCA(passportData, csca as string);
      await markCurrentDocumentAsRegistered(selfClient);
      trackEvent(BackupEvents.CLOUD_RESTORE_SUCCESS);
      trackEvent(BackupEvents.ACCOUNT_RECOVERY_COMPLETED);
      onRestoreFromCloudNext();
      setRestoring(false);
    } catch (e: unknown) {
      console.error(e);
      trackEvent(BackupEvents.CLOUD_RESTORE_FAILED_UNKNOWN);
      setRestoring(false);
      throw new Error('Something wrong happened during cloud recovery');
    }
  }, [
    trackEvent,
    download,
    restoreAccountFromMnemonic,
    cloudBackupEnabled,
    onRestoreFromCloudNext,
    navigation,
    toggleCloudBackupEnabled,
    useProtocolStore,
    selfClient,
  ]);

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
            {biometricsAvailable && (
              <>
                Your device doesn't support biometrics or is disabled for apps
                and is required for cloud storage.
              </>
            )}
          </Description>

          <YStack gap="$2.5" width="100%" paddingTop="$6">
            <PrimaryButton
              trackEvent={BackupEvents.CLOUD_BACKUP_STARTED}
              onPress={onRestoreFromCloudPress}
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
