//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import React from 'react';
import { View, YStack } from 'tamagui';

import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import { BackupEvents } from '../../consts/analytics';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import RestoreAccountSvg from '../../images/icons/restore_account.svg';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { black, slate600, white } from '../../utils/colors';

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
          </Description>

          <YStack gap="$2.5" width="100%" pt="$6">
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
