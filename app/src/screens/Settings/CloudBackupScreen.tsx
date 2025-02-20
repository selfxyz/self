import React, { useCallback, useMemo, useState } from 'react';

import { StaticScreenProps, useNavigation } from '@react-navigation/native';
import { YStack } from 'tamagui';

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
import { buttonTap, confirmTap } from '../../utils/haptic';

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
    buttonTap();
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
    navigation.goBack();
  };

  if (nextScreen && cloudBackupEnabled) {
    return (
      <PrimaryButton
        onPress={() => {
          confirmTap();
          navigation.navigate(nextScreen);
        }}
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
      >
        Back up manually
      </SecondaryButton>
    );

    // if no next screen probably came from settings. Go back to settings
  } else if (cloudBackupEnabled) {
    return <PrimaryButton onPress={goBack}>Nevermind</PrimaryButton>;
  } else {
    return <SecondaryButton onPress={goBack}>Nevermind</SecondaryButton>;
  }
}

export default CloudBackupScreen;
