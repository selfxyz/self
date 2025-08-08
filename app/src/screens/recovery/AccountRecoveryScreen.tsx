// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React from 'react';
import { View, YStack } from 'tamagui';

import { PrimaryButton } from '@src/components/buttons/PrimaryButton';
import { SecondaryButton } from '@src/components/buttons/SecondaryButton';
import Description from '@src/components/typography/Description';
import { Title } from '@src/components/typography/Title';
import { BackupEvents } from '@src/consts/analytics';
import useHapticNavigation from '@src/hooks/useHapticNavigation';
import RestoreAccountSvg from '@src/images/icons/restore_account.svg';
import { ExpandableBottomLayout } from '@src/layouts/ExpandableBottomLayout';
import { black, slate600, white } from '@src/utils/colors';

interface AccountRecoveryScreenProps {}

const AccountRecoveryScreen: React.FC<AccountRecoveryScreenProps> = ({}) => {
  const onRestoreAccountPress = useHapticNavigation('AccountRecoveryChoice');
  const onCreateAccountPress = useHapticNavigation('CloudBackupSettings', {
    params: {
      nextScreen: 'SaveRecoveryPhrase',
    },
  });

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
          <Title>Restore your Self account</Title>
          <Description>
            By continuing, you certify that this passport belongs to you and is
            not stolen or forged.
          </Description>

          <YStack gap="$2.5" width="100%" paddingTop="$6">
            <PrimaryButton
              trackEvent={BackupEvents.ACCOUNT_RECOVERY_STARTED}
              onPress={onRestoreAccountPress}
            >
              Restore my account
            </PrimaryButton>
            <SecondaryButton
              trackEvent={BackupEvents.CREATE_NEW_ACCOUNT}
              onPress={onCreateAccountPress}
            >
              Create new account
            </SecondaryButton>
          </YStack>
        </YStack>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default AccountRecoveryScreen;
