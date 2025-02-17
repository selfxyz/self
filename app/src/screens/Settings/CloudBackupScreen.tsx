import { RootStackParamList } from '../../Navigation';
import BackupDocumentationLink from '../../components/BackupDocumentationLink';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import { Caption } from '../../components/typography/Caption';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import { useModal } from '../../hooks/useModal';
import Cloud from '../../images/icons/logo_cloud_backup.svg';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { useAuth } from '../../stores/authProvider';
import { useSettingStore } from '../../stores/settingStore';
import { STORAGE_NAME, useBackupPrivateKey } from '../../utils/cloudBackup';
import { black, white } from '../../utils/colors';
import { StaticScreenProps, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { YStack } from 'tamagui';

interface CloudBackupScreenProps
  extends StaticScreenProps<
    | {
        nextScreen?: Omit<'CloudBackupSettings', keyof RootStackParamList>;
      }
    | undefined
  > {}

const CloudBackupScreen: React.FC<CloudBackupScreenProps> = ({
  route: { params },
}) => {
  const navigation = useNavigation();
  const { getOrCreatePrivateKey, loginWithBiometrics } = useAuth();
  const { cloudBackupEnabled, toggleCloudBackupEnabled, biometricsAvailable } =
    useSettingStore();
  const { upload, disableBackup } = useBackupPrivateKey();
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
            await loginWithBiometrics();
            await disableBackup();
            toggleCloudBackupEnabled();
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
    if (cloudBackupEnabled) {
      return;
    }

    setPending(true);

    const privKey = await getOrCreatePrivateKey();
    if (!privKey) {
      setPending(false);
      return;
    }
    await upload(privKey.data);
    toggleCloudBackupEnabled();
    setPending(false);
  }, [
    cloudBackupEnabled,
    getOrCreatePrivateKey,
    upload,
    toggleCloudBackupEnabled,
  ]);

  const disableCloudBackups = useCallback(() => {
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
              >
                {pending ? 'Disabling' : 'Disable'} {STORAGE_NAME} backups
                {pending ? '…' : ''}
              </SecondaryButton>
            ) : (
              <PrimaryButton
                onPress={enableCloudBackups}
                disabled={pending || !biometricsAvailable}
              >
                {pending ? 'Enabling' : 'Enable'} {STORAGE_NAME} backups
                {pending ? '…' : ''}
              </PrimaryButton>
            )}

            {params?.nextScreen ? (
              <PrimaryButton
                onPress={() => navigation.navigate(params.nextScreen)}
              >
                Continue
              </PrimaryButton>
            ) : (
              <SecondaryButton onPress={() => navigation.goBack()}>
                Nevermind
              </SecondaryButton>
            )}
          </YStack>
        </YStack>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default CloudBackupScreen;
