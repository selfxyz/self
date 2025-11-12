// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { View, YStack } from 'tamagui';

import {
  Description,
  PrimaryButton,
  SecondaryButton,
  Title,
} from '@selfxyz/mobile-sdk-alpha/components';
import { BackupEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  black,
  slate600,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import RestoreAccountSvg from '@/assets/icons/restore_account.svg';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';

const AccountRecoveryScreen: React.FC = () => {
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
