import { StaticScreenProps, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { YStack } from 'tamagui';

import BackupDocumentationLink from '../../components/BackupDocumentationLink';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import { Caption } from '../../components/typography/Caption';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import { useModal } from '../../hooks/useModal';
import Cloud from '../../images/icons/logo_cloud_backup.svg';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { RootStackParamList } from '../../Navigation';
import { useAuth } from '../../stores/authProvider';
import { useSettingStore } from '../../stores/settingStore';
import analytics from '../../utils/analytics';
import { STORAGE_NAME, useBackupMnemonic } from '../../utils/cloudBackup';
import { black, white } from '../../utils/colors';
import { buttonTap, confirmTap } from '../../utils/haptic';

const { trackEvent } = analytics();

type NextScreen = keyof Pick<RootStackParamList, 'SaveRecoveryPhrase'>;

interface CloudBackupScreenProps
  extends StaticScreenProps<
    | {
        nextScreen?: NextScreen;
      }
    | undefined
  > {}

const CloudBackupScreen: React.FC<CloudBackupScreenProps> = ({
  route: { params },
}) => {
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
            trackEvent('Cloud Backup Disable Started');
            await loginWithBiometrics();
            await disableBackup();
            toggleCloudBackupEnabled();
            trackEvent('Cloud Backup Disabled Done');
          } finally {
            setPending(false);
          }
        },
        onModalDismiss: () => {
          setPending(false);
        },
      }),
      [loginWithBiometrics, disableBackup, toggleCloudBackupEnabled],
    ),
  );

  const enableCloudBackups = useCallback(async () => {
    buttonTap();
    if (cloudBackupEnabled) {
      return;
    }

    trackEvent('Cloud Backup Enable Started');

    setPending(true);

    const storedMnemonic = await getOrCreateMnemonic();
    if (!storedMnemonic) {
      setPending(false);
      return;
    }
    await upload(storedMnemonic.data);
    toggleCloudBackupEnabled();
    trackEvent('Cloud Backup Enabled Done');
    setPending(false);
  }, [
    cloudBackupEnabled,
    getOrCreateMnemonic,
    upload,
    toggleCloudBackupEnabled,
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
        <YStack alignItems="center" gap="$2.5" pb="$2.5">
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

          <YStack gap="$2.5" width="100%" pt="$6">
            {cloudBackupEnabled ? (
              <SecondaryButton
                onPress={disableCloudBackups}
                disabled={pending || !biometricsAvailable}
                trackEvent="Disable Cloud Backup"
              >
                {pending ? 'Disabling' : 'Disable'} {STORAGE_NAME} backups
                {pending ? '…' : ''}
              </SecondaryButton>
            ) : (
              <PrimaryButton
                onPress={enableCloudBackups}
                disabled={pending || !biometricsAvailable}
                trackEvent="Enable Cloud Backup"
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
  const navigation = useNavigation();

  const goBack = () => {
    confirmTap();
    trackEvent('Cloud Backup Cancelled');
    navigation.goBack();
  };

  if (nextScreen && cloudBackupEnabled) {
    return (
      <PrimaryButton
        onPress={() => {
          confirmTap();
          navigation.navigate(nextScreen);
        }}
        trackEvent="Cloud Backup Continue"
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
        trackEvent="Cloud Backup Manual"
      >
        Back up manually
      </SecondaryButton>
    );
  } else if (cloudBackupEnabled) {
    return (
      <PrimaryButton onPress={goBack} trackEvent="Cloud Backup Cancel">
        Nevermind
      </PrimaryButton>
    );
  } else {
    return (
      <SecondaryButton onPress={goBack} trackEvent="Cloud Backup Cancel">
        Nevermind
      </SecondaryButton>
    );
  }
}

export default CloudBackupScreen;
