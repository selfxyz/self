import React, { useCallback } from 'react';

import { StaticScreenProps, useNavigation } from '@react-navigation/native';
import { YStack } from 'tamagui';

import { RootStackParamList } from '../../Navigation';
import BackupDocumentationLink from '../../components/BackupDocumentationLink';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import { Caption } from '../../components/typography/Caption';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import Cloud from '../../images/icons/logo_cloud_backup.svg';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { useAuth } from '../../stores/authProvider';
import { useSettingStore } from '../../stores/settingStore';
import { STORAGE_NAME, useBackupPrivateKey } from '../../utils/cloudBackup';
import { black, white } from '../../utils/colors';

interface CloudBackupScreenProps
  extends StaticScreenProps<
    | {
        nextScreen: keyof RootStackParamList;
      }
    | undefined
  > {}

const CloudBackupScreen: React.FC<CloudBackupScreenProps> = ({
  route: { params },
}) => {
  const navigation = useNavigation();
  const { getOrCreatePrivateKey } = useAuth();
  const { cloudBackupEnabled, toggleCloudBackupEnabled } = useSettingStore();
  const { upload, disableBackup } = useBackupPrivateKey();

  const toggleBackup = useCallback(async () => {
    const privKey = await getOrCreatePrivateKey();
    if (!privKey) {
      return;
    }

    if (cloudBackupEnabled) {
      await disableBackup();
    } else {
      await upload(privKey.data);
    }
    toggleCloudBackupEnabled();
  }, [cloudBackupEnabled, upload, getOrCreatePrivateKey]);

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
            Learn more about <BackupDocumentationLink />
          </Caption>

          <YStack gap="$2.5" width="100%" pt="$6">
            {cloudBackupEnabled ? (
              <SecondaryButton onPress={toggleBackup}>
                Disable {STORAGE_NAME}
              </SecondaryButton>
            ) : (
              <PrimaryButton onPress={toggleBackup}>
                Enable {STORAGE_NAME}
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
