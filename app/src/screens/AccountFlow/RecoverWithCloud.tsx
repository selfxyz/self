import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { YStack } from 'tamagui';

import BackupDocumentationLink from '../../components/BackupDocumentationLink';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { Caption } from '../../components/typography/Caption';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import Cloud from '../../images/icons/logo_cloud_backup.svg';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { useAuth } from '../../stores/authProvider';
import { useSettingStore } from '../../stores/settingStore';
import { STORAGE_NAME, useBackupPrivateKey } from '../../utils/cloudBackup';
import { black, white } from '../../utils/colors';

interface RecoverWithCloudScreenProps {}

const RecoverWithCloudScreen: React.FC<RecoverWithCloudScreenProps> = ({}) => {
  const navigation = useNavigation();
  const { restoreAccountFromPrivateKey } = useAuth();
  const { cloudBackupEnabled, toggleCloudBackupEnabled } = useSettingStore();
  const { download } = useBackupPrivateKey();

  const restoreBackup = useCallback(async () => {
    const restoredPrivKey = await download();
    try {
      await restoreAccountFromPrivateKey(restoredPrivKey);
      if (!cloudBackupEnabled) {
        toggleCloudBackupEnabled();
      }
      navigation.navigate('AccountVerifiedSuccess');
    } catch (e) {
      console.error(e);
      throw new Error('Something wrong happened during cloud recovery');
    }
  }, [cloudBackupEnabled, download, restoreAccountFromPrivateKey]);
  return (
    <ExpandableBottomLayout.Layout backgroundColor={black}>
      <ExpandableBottomLayout.TopSection backgroundColor={black}>
        <Cloud height={200} width={140} color={white} />
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection
        flexGrow={1}
        backgroundColor={white}
      >
        <YStack gap="$10">
          <YStack gap="$2.5" alignItems="center">
            <Title>Restore your Self Account</Title>
            <Description>
              Your account will safely downloaded and restored from{' '}
              {STORAGE_NAME}.
            </Description>
            <Caption>
              Learn more about <BackupDocumentationLink />
            </Caption>
          </YStack>
          <PrimaryButton onPress={restoreBackup}>
            Restore from {STORAGE_NAME}
          </PrimaryButton>
        </YStack>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default RecoverWithCloudScreen;
