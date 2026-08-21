// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Separator, Text, View, XStack, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

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
  red500,
  slate500,
  slate600,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import Keyboard from '@/assets/icons/keyboard.svg';
import RestoreAccountSvg from '@/assets/icons/restore_account.svg';
import { useBiometricsAvailability } from '@/hooks/useBiometricsAvailability';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import type { RootStackParamList } from '@/navigation';
import { getPrivateKeyFromMnemonic, useAuth } from '@/providers/authProvider';
import {
  loadPassportData,
  reStorePassportDataWithRightCSCA,
} from '@/providers/passportDataProvider';
import {
  checkRestoredDocumentRegistration,
  ProtocolDataUnavailableError,
} from '@/proving/checkRestoredDocumentRegistration';
import { recoveryCopy } from '@/screens/account/recovery/recoveryCopy';
import { useBackupMnemonic } from '@/services/cloud-backup';
import type { CloudBackupErrorReason } from '@/services/cloud-backup/errors';
import { isCloudBackupError } from '@/services/cloud-backup/errors';
import { useSettingStore } from '@/stores/settingStore';
import type { Mnemonic } from '@/types/mnemonic';

/**
 * Every way a cloud restore can fail. Built on `CloudBackupErrorReason` so any
 * new download failure is renderable by construction rather than collapsing into
 * "something went wrong".
 */
type CloudRecoveryError =
  | CloudBackupErrorReason
  | 'restore_failed'
  | 'not_registered'
  | 'network_error'
  | 'unexpected_error';

const AccountRecoveryChoiceScreen: React.FC = () => {
  const selfClient = useSelfClient();
  const { trackEvent } = useSelfClient();
  const { restoreAccountFromMnemonic } = useAuth();
  // DISABLED FOR NOW: Turnkey functionality
  // const { turnkeyWallets, refreshWallets } = useTurnkeyUtils();
  // const { getMnemonic } = useTurnkeyUtils();
  // const { authState } = useTurnkey();
  const [_restoringFromTurnkey, _setRestoringFromTurnkey] = useState(false);
  const [restoringFromCloud, setRestoringFromCloud] = useState(false);
  const [error, setError] = useState<CloudRecoveryError | null>(null);
  const { cloudBackupEnabled, toggleCloudBackupEnabled } = useSettingStore();
  const biometricsAvailable = useBiometricsAvailability();
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
      setRestoring: (value: boolean) => void,
    ): Promise<boolean> => {
      try {
        const result = await restoreAccountFromMnemonic(mnemonic.phrase);

        if (!result) {
          console.warn('Failed to restore account');
          trackEvent(BackupEvents.CLOUD_RESTORE_FAILED_UNKNOWN, {
            reason: 'restore_failed',
          });
          setError('restore_failed');
          setRestoring(false);
          return false;
        }

        const passportData = await loadPassportData();

        if (!passportData) {
          console.warn(
            'Recovered secret but no local document data was found. Prompting the user to import their document again.',
          );
          if (isCloudRestore && !cloudBackupEnabled) {
            toggleCloudBackupEnabled();
          }
          trackEvent(BackupEvents.CLOUD_RESTORE_SUCCESS, {
            documentImportRequired: true,
          });
          navigation.navigate('CountryPicker');
          setRestoring(false);
          return true;
        }

        const passportDataParsed = JSON.parse(passportData);
        const secret = getPrivateKeyFromMnemonic(mnemonic.phrase);

        const { isRegistered, csca } = await checkRestoredDocumentRegistration(
          selfClient,
          passportDataParsed,
          secret as string,
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
          setError('not_registered');
          setRestoring(false);
          return false;
        }
        if (isCloudRestore && !cloudBackupEnabled) {
          toggleCloudBackupEnabled();
        }
        if (csca) {
          await reStorePassportDataWithRightCSCA(passportDataParsed, csca);
        }
        await markCurrentDocumentAsRegistered(selfClient);
        trackEvent(BackupEvents.CLOUD_RESTORE_SUCCESS);
        trackEvent(BackupEvents.ACCOUNT_RECOVERY_COMPLETED);
        onRestoreFromCloudNext();
        setRestoring(false);
        return true;
      } catch (e: unknown) {
        console.error(
          'Restore account error:',
          e instanceof Error ? e.message : 'Unknown error',
        );
        const isProtocolDataUnavailable =
          e instanceof ProtocolDataUnavailableError;
        trackEvent(BackupEvents.CLOUD_RESTORE_FAILED_UNKNOWN, {
          reason: isProtocolDataUnavailable
            ? 'protocol_data_unavailable'
            : 'unexpected_error',
          error: e instanceof Error ? e.name : 'unknown',
        });
        setError(
          isProtocolDataUnavailable ? 'network_error' : 'unexpected_error',
        );
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
      selfClient,
    ],
  );

  // DISABLED FOR NOW: Turnkey functionality
  // const onRestoreFromTurnkeyPress = useCallback(async () => {
  //   setRestoringFromTurnkey(true);
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
  //     const success = await restoreAccountFlow(
  //       mnemonic,
  //       false,
  //       setRestoringFromTurnkey,
  //     );
  //     if (success) {
  //       setTurnkeyBackupEnabled(true);
  //     }
  //   } catch (error) {
  //     console.error('Turnkey restore error:', error);
  //     trackEvent(BackupEvents.CLOUD_RESTORE_FAILED_UNKNOWN);
  //   } finally {
  //     setRestoringFromTurnkey(false);
  //   }
  // }, [getMnemonic, restoreAccountFlow, setTurnkeyBackupEnabled, trackEvent]);

  const onRestoreFromCloudPress = useCallback(async () => {
    trackEvent(BackupEvents.CLOUD_RESTORE_STARTED);
    setError(null);
    setRestoringFromCloud(true);
    try {
      const mnemonic = await download();
      await restoreAccountFlow(mnemonic, true, setRestoringFromCloud);
    } catch (downloadError) {
      console.error(
        'Cloud restore error:',
        downloadError instanceof Error
          ? downloadError.message
          : 'Unknown error',
      );
      // A classified reason is both the message the user sees and the analytics
      // reason. Anything unclassified keeps the legacy bucket so it stays
      // distinguishable from a restore that failed after the download.
      const reason = isCloudBackupError(downloadError)
        ? downloadError.reason
        : null;
      trackEvent(BackupEvents.CLOUD_RESTORE_FAILED_UNKNOWN, {
        reason: reason ?? 'backup_download_failed',
        error: downloadError instanceof Error ? downloadError.name : 'unknown',
      });
      setError(reason ?? 'unexpected_error');
      setRestoringFromCloud(false);
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
          <Title>{recoveryCopy.choice.title}</Title>
          <Description>{recoveryCopy.choice.description}</Description>

          {error && (
            <Text style={styles.errorText}>{recoveryCopy.errors[error]}</Text>
          )}

          <YStack gap="$2.5" width="100%" paddingTop="$6">
            {/* DISABLED FOR NOW: Turnkey functionality */}
            {/* <PrimaryButton
              trackEvent={BackupEvents.CLOUD_BACKUP_STARTED}
              onPress={onRestoreFromTurnkeyPress}
              testID="button-from-turnkey"
              disabled={
                restoringFromTurnkey ||
                !biometricsAvailable ||
                (authState === AuthState.Authenticated &&
                  turnkeyWallets.length === 0)
              }
            >
              {restoringFromTurnkey ? 'Restoring' : 'Restore'} from Turnkey
              {restoringFromTurnkey ? '…' : ''}
            </PrimaryButton> */}
            <PrimaryButton
              onPress={onRestoreFromCloudPress}
              testID="button-from-teststorage"
              disabled={restoringFromCloud || !biometricsAvailable}
            >
              {recoveryCopy.choice.actions.cloud(restoringFromCloud)}
            </PrimaryButton>
            {!biometricsAvailable && (
              <Text style={styles.noticeText}>
                {recoveryCopy.choice.noBiometrics}
              </Text>
            )}
            <XStack gap={64} alignItems="center" justifyContent="space-between">
              <Separator flexGrow={1} />
              <Caption>{recoveryCopy.choice.actions.or}</Caption>
              <Separator flexGrow={1} />
            </XStack>
            <SecondaryButton
              trackEvent={BackupEvents.MANUAL_RECOVERY_SELECTED}
              onPress={handleManualRecoveryPress}
            >
              <XStack alignItems="center" justifyContent="center">
                <Keyboard height={25} width={40} color={slate500} />
                <View paddingLeft={12}>
                  <Description>
                    {recoveryCopy.choice.actions.phrase}
                  </Description>
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

const styles = StyleSheet.create({
  errorText: {
    color: red500,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  noticeText: {
    color: slate500,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
