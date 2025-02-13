import React, { useCallback, useState } from 'react';
import { Separator, View, XStack, YStack } from 'tamagui';

import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import { Caption } from '../../components/typography/Caption';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import Keyboard from '../../images/icons/keyboard.svg';
import RestoreAccountSvg from '../../images/icons/restore_account.svg';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { useAuth } from '../../stores/authProvider';
import { useSettingStore } from '../../stores/settingStore';
import { STORAGE_NAME, useBackupPrivateKey } from '../../utils/cloudBackup';
import { black, slate500, slate600, white } from '../../utils/colors';

interface AccountRecoveryChoiceScreenProps {}

const AccountRecoveryChoiceScreen: React.FC<
  AccountRecoveryChoiceScreenProps
> = ({}) => {
  const { restoreAccountFromPrivateKey } = useAuth();
  const [restoring, setRestoring] = useState(false);
  const { cloudBackupEnabled, toggleCloudBackupEnabled, biometricsAvailable } =
    useSettingStore();
  const { download } = useBackupPrivateKey();

  const onRestoreFromCloudNext = useHapticNavigation('AccountVerifiedSuccess');
  const onEnterRecoveryPress = useHapticNavigation('RecoverWithPhrase');

  const onRestoreFromCloudPress = useCallback(async () => {
    setRestoring(true);
    try {
      const restoredPrivKey = await download();
      await restoreAccountFromPrivateKey(restoredPrivKey);
      if (!cloudBackupEnabled) {
        toggleCloudBackupEnabled();
      }
      onRestoreFromCloudNext();
    } catch (e) {
      console.error(e);
      setRestoring(false);
      throw new Error('Something wrong happened during cloud recovery');
    }
  }, [
    cloudBackupEnabled,
    download,
    restoreAccountFromPrivateKey,
    onRestoreFromCloudNext,
  ]);

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
            not stolen or forged.
            {biometricsAvailable && (
              <>
                Your device doesn't support biometrics or is disabled for apps
                and is required for cloud storage.
              </>
            )}
          </Description>

          <YStack gap="$2.5" width="100%" pt="$6">
            <PrimaryButton
              onPress={onRestoreFromCloudPress}
              disabled={restoring || !biometricsAvailable}
            >
              Restore from {STORAGE_NAME}
            </PrimaryButton>
            <XStack gap={64} ai="center" justifyContent="space-between">
              <Separator flexGrow={1} />
              <Caption>OR</Caption>
              <Separator flexGrow={1} />
            </XStack>
            <SecondaryButton
              onPress={onEnterRecoveryPress}
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
