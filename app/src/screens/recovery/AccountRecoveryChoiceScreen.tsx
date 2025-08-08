// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React, { useCallback, useState } from 'react';
import { Separator, View, XStack, YStack } from 'tamagui';

import { useNavigation } from '@react-navigation/native';
import { PrimaryButton } from '@src/components/buttons/PrimaryButton';
import { SecondaryButton } from '@src/components/buttons/SecondaryButton';
import { Caption } from '@src/components/typography/Caption';
import Description from '@src/components/typography/Description';
import { Title } from '@src/components/typography/Title';
import { BackupEvents } from '@src/consts/analytics';
import useHapticNavigation from '@src/hooks/useHapticNavigation';
import Keyboard from '@src/images/icons/keyboard.svg';
import RestoreAccountSvg from '@src/images/icons/restore_account.svg';
import { ExpandableBottomLayout } from '@src/layouts/ExpandableBottomLayout';
import { useAuth } from '@src/providers/authProvider';
import {
  loadPassportDataAndSecret,
  reStorePassportDataWithRightCSCA,
} from '@src/providers/passportDataProvider';
import { useSettingStore } from '@src/stores/settingStore';
import analytics from '@src/utils/analytics';
import { STORAGE_NAME, useBackupMnemonic } from '@src/utils/cloudBackup';
import { black, slate500, slate600, white } from '@src/utils/colors';
import { isUserRegisteredWithAlternativeCSCA } from '@src/utils/proving/validateDocument';

const { trackEvent } = analytics();

interface AccountRecoveryChoiceScreenProps {}

const AccountRecoveryChoiceScreen: React.FC<
  AccountRecoveryChoiceScreenProps
> = ({}) => {
  const { restoreAccountFromMnemonic } = useAuth();
  const [restoring, setRestoring] = useState(false);
  const { cloudBackupEnabled, toggleCloudBackupEnabled, biometricsAvailable } =
    useSettingStore();
  const { download } = useBackupMnemonic();
  const navigation = useNavigation();

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
    download,
    restoreAccountFromMnemonic,
    cloudBackupEnabled,
    onRestoreFromCloudNext,
    navigation,
    toggleCloudBackupEnabled,
  ]);

  const handleManualRecoveryPress = useCallback(() => {
    trackEvent(BackupEvents.MANUAL_RECOVERY_SELECTED);
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
