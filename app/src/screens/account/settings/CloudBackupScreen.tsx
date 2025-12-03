// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { YStack } from 'tamagui';
import type { StaticScreenProps } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  hasAnyValidRegisteredDocument,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import {
  PrimaryButton,
  SecondaryButton,
} from '@selfxyz/mobile-sdk-alpha/components';
import { BackupEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  black,
  blue600,
  slate200,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { advercase, dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import Cloud from '@/assets/icons/logo_cloud_backup.svg';
import { useModal } from '@/hooks/useModal';
import { buttonTap, confirmTap } from '@/integrations/haptics';
import type { RootStackParamList } from '@/navigation';
import { useAuth } from '@/providers/authProvider';
import { STORAGE_NAME, useBackupMnemonic } from '@/services/cloud-backup';
import { useSettingStore } from '@/stores/settingStore';

type NextScreen = keyof Pick<RootStackParamList, 'SaveRecoveryPhrase'>;

type CloudBackupScreenProps = StaticScreenProps<
  | {
      nextScreen?: NextScreen;
      returnToScreen?: 'Points';
    }
  | undefined
>;

type BackupMethod = 'icloud' | 'turnkey' | null;

const CloudBackupScreen: React.FC<CloudBackupScreenProps> = ({
  route: { params },
}) => {
  const { trackEvent } = useSelfClient();
  // DISABLED FOR NOW: Turnkey functionality
  // const { backupAccount } = useTurnkeyUtils();
  const { getOrCreateMnemonic, loginWithBiometrics } = useAuth();
  const {
    cloudBackupEnabled,
    toggleCloudBackupEnabled,
    biometricsAvailable,
    // DISABLED FOR NOW: Turnkey functionality
    // turnkeyBackupEnabled,
  } = useSettingStore();
  const { upload, disableBackup } = useBackupMnemonic();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [_selectedMethod, setSelectedMethod] = useState<BackupMethod>(null);
  const [iCloudPending, setICloudPending] = useState(false);
  const selfClient = useSelfClient();
  // DISABLED FOR NOW: Turnkey functionality
  // const [turnkeyPending, setTurnkeyPending] = useState(false);

  const { showModal: showDisableModal } = useModal(
    useMemo(
      () => ({
        titleText: 'Disable cloud backups',
        bodyText:
          'Are you sure you want to disable cloud backups, you may lose your recovery phrase.',
        buttonText: 'I understand the risks',
        onButtonPress: async () => {
          try {
            trackEvent(BackupEvents.CLOUD_BACKUP_DISABLE_STARTED);
            await loginWithBiometrics();
            await disableBackup();
            toggleCloudBackupEnabled();
            trackEvent(BackupEvents.CLOUD_BACKUP_DISABLED_DONE);
          } finally {
            setICloudPending(false);
          }
        },
        onModalDismiss: () => {
          setICloudPending(false);
        },
      }),
      [
        loginWithBiometrics,
        disableBackup,
        toggleCloudBackupEnabled,
        trackEvent,
      ],
    ),
  );

  const { showModal: showNoRegisteredAccountModal } = useModal(
    useMemo(
      () => ({
        titleText: 'No registered account',
        bodyText: 'You need to register an account to enable cloud backups.',
        buttonText: 'Register now',
        secondaryButtonText: 'Cancel',
        onButtonPress: () => {
          // setTimeout to ensure modal closes before navigation to prevent navigation conflicts when the modal tries to goBack()
          setTimeout(() => {
            navigation.navigate('CountryPicker');
          }, 100);
        },
        onModalDismiss: () => {},
      }),
      [navigation],
    ),
  );

  // DISABLED FOR NOW: Turnkey functionality
  // const { showModal: showAlreadySignedInModal } = useModal({
  //   titleText: 'Cannot use this email',
  //   bodyText:
  //     'You cannot use this email. Please try again with a different email address.',
  //   buttonText: 'OK',
  //   onButtonPress: () => {},
  //   onModalDismiss: () => {},
  // });

  // const { showModal: showAlreadyBackedUpModal } = useModal({
  //   titleText: 'Already backed up with Turnkey',
  //   bodyText: 'You have already backed up your account with Turnkey.',
  //   buttonText: 'OK',
  //   onButtonPress: () => {},
  //   onModalDismiss: () => {},
  // });
  const handleICloudBackup = useCallback(async () => {
    buttonTap();
    setSelectedMethod('icloud');

    const hasAnyValidRegisteredDocumentResult =
      await hasAnyValidRegisteredDocument(selfClient);
    if (!hasAnyValidRegisteredDocumentResult) {
      showNoRegisteredAccountModal();
      return;
    }

    if (cloudBackupEnabled || !biometricsAvailable) {
      return;
    }

    trackEvent(BackupEvents.CLOUD_BACKUP_ENABLE_STARTED);
    setICloudPending(true);

    try {
      const storedMnemonic = await getOrCreateMnemonic();
      if (!storedMnemonic) {
        setICloudPending(false);
        return;
      }
      await upload(storedMnemonic.data);
      toggleCloudBackupEnabled();
      trackEvent(BackupEvents.CLOUD_BACKUP_ENABLED_DONE);

      if (params?.returnToScreen) {
        navigation.navigate(params.returnToScreen);
      }
    } catch (error) {
      console.error('iCloud backup error', error);
    } finally {
      setICloudPending(false);
    }
  }, [
    cloudBackupEnabled,
    biometricsAvailable,
    getOrCreateMnemonic,
    upload,
    toggleCloudBackupEnabled,
    trackEvent,
    navigation,
    params,
    selfClient,
    showNoRegisteredAccountModal,
  ]);

  const disableCloudBackups = useCallback(() => {
    confirmTap();
    setICloudPending(true);
    showDisableModal();
  }, [showDisableModal]);

  // DISABLED FOR NOW: Turnkey functionality
  // const handleTurnkeyBackup = useCallback(async () => {
  //   buttonTap();
  //   setSelectedMethod('turnkey');

  //   if (turnkeyBackupEnabled) {
  //     return;
  //   }

  //   setTurnkeyPending(true);

  //   try {
  //     const mnemonics = await getOrCreateMnemonic();

  //     if (!mnemonics?.data.phrase) {
  //       console.error('No mnemonic found');
  //       setTurnkeyPending(false);
  //       return;
  //     }

  //     await backupAccount(mnemonics.data.phrase);
  //     setTurnkeyPending(false);

  //     if (params?.returnToScreen) {
  //       navigation.navigate(params.returnToScreen);
  //     }
  //   } catch (error) {
  //     if (error instanceof Error && error.message === 'already_exists') {
  //       console.log('Already signed in with Turnkey');
  //       showAlreadySignedInModal();
  //     } else if (
  //       error instanceof Error &&
  //       error.message === 'already_backed_up'
  //     ) {
  //       console.log('Already backed up with Turnkey');
  //       if (params?.returnToScreen) {
  //         navigation.navigate(params.returnToScreen);
  //       } else if (params?.nextScreen) {
  //         navigation.navigate(params.nextScreen);
  //       } else {
  //         showAlreadyBackedUpModal();
  //       }
  //     } else {
  //       console.error('Turnkey backup error', error);
  //     }
  //     setTurnkeyPending(false);
  //   }
  // }, [
  //   turnkeyBackupEnabled,
  //   backupAccount,
  //   getOrCreateMnemonic,
  //   showAlreadySignedInModal,
  //   showAlreadyBackedUpModal,
  //   navigation,
  //   params,
  // ]);

  return (
    <YStack flex={1} backgroundColor={white}>
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        paddingHorizontal={20}
        paddingBottom={20}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Cloud width={56} height={56} color={white} />
          </View>

          <View style={styles.descriptionContainer}>
            <Text style={styles.title}>Protect your account</Text>
            <Text style={styles.description}>
              Back up your account so you can restore your data if you lose your
              device or get a new one.
            </Text>
          </View>

          <View style={styles.optionsContainer}>
            {cloudBackupEnabled ? (
              <SecondaryButton
                onPress={disableCloudBackups}
                disabled={iCloudPending || !biometricsAvailable}
                trackEvent={BackupEvents.CLOUD_BACKUP_DISABLE_STARTED}
              >
                {iCloudPending ? 'Disabling' : 'Disable'} {STORAGE_NAME} backups
                {iCloudPending ? '…' : ''}
              </SecondaryButton>
            ) : (
              <Pressable
                style={[
                  styles.optionButton,
                  (iCloudPending || !biometricsAvailable) &&
                    styles.optionButtonDisabled,
                ]}
                onPress={handleICloudBackup}
                disabled={iCloudPending || !biometricsAvailable}
              >
                <Cloud width={24} height={24} color={black} />
                <Text style={styles.optionText}>
                  {iCloudPending ? 'Enabling' : 'Backup with'} {STORAGE_NAME}
                  {iCloudPending ? '…' : ''}
                </Text>
              </Pressable>
            )}

            {/* DISABLED FOR NOW: Turnkey functionality */}
            {/* {turnkeyBackupEnabled ? (
              <SecondaryButton
                disabled
                trackEvent={BackupEvents.CLOUD_BACKUP_DISABLE_STARTED}
              >
                Backed up with Turnkey
              </SecondaryButton>
            ) : (
              <Pressable
                style={[
                  styles.optionButton,
                  turnkeyPending && styles.optionButtonDisabled,
                ]}
                onPress={handleTurnkeyBackup}
                disabled={turnkeyPending}
              >
                <Wallet size={24} color={black} />
                <Text style={styles.optionText}>
                  {turnkeyPending ? 'Importing' : 'Backup with'} Turnkey
                  {turnkeyPending ? '…' : ''}
                </Text>
              </Pressable>
            )} */}

            <BottomButton
              cloudBackupEnabled={cloudBackupEnabled}
              turnkeyBackupEnabled={false}
              nextScreen={params?.nextScreen}
            />
          </View>

          {!biometricsAvailable && (
            <Text style={styles.warningText}>
              Your device doesn't support biometrics or is disabled for apps and
              is required for cloud storage.
            </Text>
          )}
        </View>
      </YStack>
    </YStack>
  );
};

function BottomButton({
  cloudBackupEnabled,
  turnkeyBackupEnabled,
  nextScreen,
}: {
  cloudBackupEnabled: boolean;
  turnkeyBackupEnabled: boolean;
  nextScreen?: NextScreen;
}) {
  const { trackEvent } = useSelfClient();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const goBack = () => {
    confirmTap();
    trackEvent(BackupEvents.CLOUD_BACKUP_CANCELLED);
    navigation.goBack();
  };

  const hasBackup = cloudBackupEnabled || turnkeyBackupEnabled;

  if (nextScreen && hasBackup) {
    return (
      <PrimaryButton
        onPress={() => {
          confirmTap();
          navigation.navigate(nextScreen);
        }}
        trackEvent={BackupEvents.CLOUD_BACKUP_CONTINUE}
      >
        Continue
      </PrimaryButton>
    );
  } else if (nextScreen && !hasBackup) {
    return (
      <SecondaryButton
        onPress={() => {
          confirmTap();
          navigation.navigate(nextScreen);
        }}
        trackEvent={BackupEvents.MANUAL_RECOVERY_SELECTED}
      >
        Back up manually
      </SecondaryButton>
    );
  } else if (hasBackup) {
    return (
      <PrimaryButton
        onPress={goBack}
        trackEvent={BackupEvents.CLOUD_BACKUP_CANCELLED}
      >
        Nevermind
      </PrimaryButton>
    );
  } else {
    return (
      <SecondaryButton
        onPress={goBack}
        trackEvent={BackupEvents.CLOUD_BACKUP_CANCELLED}
      >
        Nevermind
      </SecondaryButton>
    );
  }
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    alignItems: 'center',
    gap: 30,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: blue600,
  },
  descriptionContainer: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  title: {
    width: '100%',
    fontSize: 28,
    letterSpacing: 1,
    fontFamily: advercase,
    color: black,
    textAlign: 'center',
  },
  description: {
    width: '100%',
    fontSize: 18,
    fontWeight: '500',
    fontFamily: dinot,
    color: black,
    textAlign: 'center',
  },
  optionsContainer: {
    width: '100%',
    gap: 10,
  },
  optionButton: {
    backgroundColor: white,
    borderWidth: 1,
    borderColor: slate200,
    borderRadius: 5,
    paddingVertical: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  optionButtonDisabled: {
    opacity: 0.5,
  },
  optionText: {
    fontFamily: dinot,
    fontWeight: '500',
    fontSize: 18,
    color: black,
  },
  warningText: {
    fontFamily: dinot,
    fontWeight: '500',
    fontSize: 14,
    color: slate500,
    textAlign: 'center',
    marginTop: 10,
  },
});

export default CloudBackupScreen;
