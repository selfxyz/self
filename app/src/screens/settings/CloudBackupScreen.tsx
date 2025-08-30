// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useMemo, useState } from 'react';
import { YStack } from 'tamagui';
import type { StaticScreenProps } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { BackupEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import BackupDocumentationLink from '@/components/BackupDocumentationLink';
import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { SecondaryButton } from '@/components/buttons/SecondaryButton';
import { Caption } from '@/components/typography/Caption';
import Description from '@/components/typography/Description';
import { Title } from '@/components/typography/Title';
import { useModal } from '@/hooks/useModal';
import Cloud from '@/images/icons/logo_cloud_backup.svg';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import type { RootStackParamList } from '@/navigation';
import { useAuth } from '@/providers/authProvider';
import { useSettingStore } from '@/stores/settingStore';
import { STORAGE_NAME, useBackupMnemonic } from '@/utils/cloudBackup';
import { black, white } from '@/utils/colors';
import { buttonTap, confirmTap } from '@/utils/haptic';

type NextScreen = keyof Pick<RootStackParamList, 'SaveRecoveryPhrase'>;

type CloudBackupScreenProps = StaticScreenProps<
  | {
      nextScreen?: NextScreen;
    }
  | undefined
>;

const CloudBackupScreen: React.FC<CloudBackupScreenProps> = ({
  route: { params },
}) => {
  const { trackEvent } = useSelfClient();
  const { getOrCreateMnemonic, loginWithBiometrics } = useAuth();
  const { cloudBackupEnabled, toggleCloudBackupEnabled, biometricsAvailable } =
    useSettingStore();
  const { upload, disableBackup } = useBackupMnemonic();
  const [pending, setPending] = useState(false);

  const { showModal } = useModal(
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
            setPending(false);
          }
        },
        onModalDismiss: () => {
          setPending(false);
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

  const enableCloudBackups = useCallback(async () => {
    buttonTap();
    if (cloudBackupEnabled) {
      return;
    }

    trackEvent(BackupEvents.CLOUD_BACKUP_ENABLE_STARTED);

    setPending(true);

    const storedMnemonic = await getOrCreateMnemonic();
    if (!storedMnemonic) {
      setPending(false);
      return;
    }
    await upload(storedMnemonic.data);
    toggleCloudBackupEnabled();
    trackEvent(BackupEvents.CLOUD_BACKUP_ENABLED_DONE);
    setPending(false);
  }, [
    cloudBackupEnabled,
    getOrCreateMnemonic,
    upload,
    toggleCloudBackupEnabled,
    trackEvent,
  ]);

  const disableCloudBackups = useCallback(() => {
    confirmTap();
    setPending(true);
    showModal();
  }, [showModal]);

  return (
    <ExpandableBottomLayout.Layout backgroundColor={black}>
      <ExpandableBottomLayout.TopSection backgroundColor={black}>
        <Cloud height={200} width={140} color={white} />
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection
        flexGrow={1}
        backgroundColor={white}
      >
        <YStack alignItems="center" gap="$2.5" paddingBottom="$2.5">
          <Title>
            {cloudBackupEnabled
              ? `${STORAGE_NAME} is enabled`
              : `Enable ${STORAGE_NAME}`}
          </Title>
          <Description>
            {cloudBackupEnabled
              ? `Your account is being end-to-end encrypted backed up to ${STORAGE_NAME} so you can easily restore it if you ever get a new phone.`
              : `Your account will be end-to-end encrypted backed up to ${STORAGE_NAME} so you can easily restore it if you ever get a new phone.`}
          </Description>
          <Caption>
            {biometricsAvailable ? (
              <>
                Learn more about <BackupDocumentationLink />
              </>
            ) : (
              <>
                Your device doesn't support biometrics or is disabled for apps
                and is required for cloud storage.
              </>
            )}
          </Caption>

          <YStack gap="$2.5" width="100%" paddingTop="$6">
            {cloudBackupEnabled ? (
              <SecondaryButton
                onPress={disableCloudBackups}
                disabled={pending || !biometricsAvailable}
                trackEvent={BackupEvents.CLOUD_BACKUP_DISABLE_STARTED}
              >
                {pending ? 'Disabling' : 'Disable'} {STORAGE_NAME} backups
                {pending ? '…' : ''}
              </SecondaryButton>
            ) : (
              <PrimaryButton
                onPress={enableCloudBackups}
                disabled={pending || !biometricsAvailable}
                trackEvent={BackupEvents.CLOUD_BACKUP_ENABLE_STARTED}
              >
                {pending ? 'Enabling' : 'Enable'} {STORAGE_NAME} backups
                {pending ? '…' : ''}
              </PrimaryButton>
            )}
            <BottomButton
              cloudBackupEnabled={cloudBackupEnabled}
              nextScreen={params?.nextScreen}
            />
          </YStack>
        </YStack>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

function BottomButton({
  cloudBackupEnabled,
  nextScreen,
}: {
  cloudBackupEnabled: boolean;
  nextScreen?: NextScreen;
}) {
  const { trackEvent } = useSelfClient();
  const navigation = useNavigation();

  const goBack = () => {
    confirmTap();
    trackEvent(BackupEvents.CLOUD_BACKUP_CANCELLED);
    navigation.goBack();
  };

  if (nextScreen && cloudBackupEnabled) {
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
  } else if (nextScreen && !cloudBackupEnabled) {
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
  } else if (cloudBackupEnabled) {
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

export default CloudBackupScreen;
