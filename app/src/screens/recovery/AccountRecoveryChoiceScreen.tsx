//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Separator, View, XStack, YStack } from 'tamagui';

import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import { Caption } from '../../components/typography/Caption';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import { BackupEvents } from '../../consts/analytics';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import Keyboard from '../../images/icons/keyboard.svg';
import RestoreAccountSvg from '../../images/icons/restore_account.svg';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { useAuth } from '../../providers/authProvider';
import {
  loadPassportDataAndSecret,
  reStorePassportDataWithRightCSCA,
} from '../../providers/passportDataProvider';
import { useSettingStore } from '../../stores/settingStore';
import analytics from '../../utils/analytics';
import { STORAGE_NAME, useBackupMnemonic } from '../../utils/cloudBackup';
import { black, slate500, slate600, white } from '../../utils/colors';
import { isUserRegisteredWithAlternativeCSCA } from '../../utils/proving/validateDocument';

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
      console.log('User is registered:', isRegistered);
      if (!isRegistered) {
        console.log(
          'Secret provided did not match a registered passport. Please try again.',
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
    } catch (e: any) {
      console.error(e);
      trackEvent(BackupEvents.CLOUD_RESTORE_FAILED_UNKNOWN);
      setRestoring(false);
      throw new Error('Something wrong happened during cloud recovery');
    }
  }, [
    cloudBackupEnabled,
    download,
    restoreAccountFromMnemonic,
    onRestoreFromCloudNext,
  ]);

  const handleManualRecoveryPress = useCallback(() => {
    trackEvent(BackupEvents.MANUAL_RECOVERY_SELECTED);
    onEnterRecoveryPress();
  }, [onEnterRecoveryPress]);

  return (
    <ExpandableBottomLayout.Layout backgroundColor={black}>
      <ExpandableBottomLayout.TopSection backgroundColor={black}>
        <View borderColor={slate600} borderWidth="$1" borderRadius="$10" p="$5">
          <RestoreAccountSvg height={80} width={80} color={white} />
        </View>
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection backgroundColor={white}>
        <YStack alignItems="center" gap="$2.5" pb="$2.5">
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

          <YStack gap="$2.5" width="100%" pt="$6">
            <PrimaryButton
              trackEvent={BackupEvents.CLOUD_BACKUP_STARTED}
              onPress={onRestoreFromCloudPress}
              disabled={restoring || !biometricsAvailable}
            >
              {restoring ? 'Restoring' : 'Restore'} from {STORAGE_NAME}
              {restoring ? '…' : ''}
            </PrimaryButton>
            <XStack gap={64} ai="center" justifyContent="space-between">
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
                <View pl={12}>
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
