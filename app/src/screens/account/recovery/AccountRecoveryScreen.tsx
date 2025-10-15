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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import useHapticNavigation from '@/hooks/useHapticNavigation';
import RestoreAccountSvg from '@/images/icons/restore_account.svg';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import useCompactLayout from '@/hooks/useCompactLayout';
import { black, slate600, white } from '@/utils/colors';

const AccountRecoveryScreen: React.FC = () => {
  const onRestoreAccountPress = useHapticNavigation('AccountRecoveryChoice');
  const onCreateAccountPress = useHapticNavigation('CloudBackupSettings', {
    params: {
      nextScreen: 'SaveRecoveryPhrase',
    },
  });
  const { selectResponsiveValue, getResponsiveHorizontalPadding } = useCompactLayout();
  const { bottom } = useSafeAreaInsets();

  const iconSize = selectResponsiveValue(64, 80);
  const iconPadding = selectResponsiveValue('$4', '$5');
  const contentGap = selectResponsiveValue('$2', '$2.5');
  const descriptionSize = selectResponsiveValue(15, 16);
  const titleSize = selectResponsiveValue(26, 32);
  const buttonStackGap = selectResponsiveValue('$2', '$2.5');
  const buttonPaddingTop = selectResponsiveValue('$4', '$6');
  const horizontalPadding = getResponsiveHorizontalPadding({ percent: 0.06 });
  const bottomPadding = bottom + selectResponsiveValue(16, 24);

  return (
    <ExpandableBottomLayout.Layout backgroundColor={black}>
      <ExpandableBottomLayout.TopSection backgroundColor={black}>
        <View
          borderColor={slate600}
          borderWidth="$1"
          borderRadius="$10"
          padding={iconPadding}
        >
          <RestoreAccountSvg height={iconSize} width={iconSize} color={white} />
        </View>
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection
        backgroundColor={white}
        paddingBottom={bottomPadding}
        paddingHorizontal={horizontalPadding}
      >
        <YStack alignItems="center" gap={contentGap} paddingBottom="$2">
          <Title style={{ fontSize: titleSize, textAlign: 'center' }}>
            Restore your Self account
          </Title>
          <Description
            style={{ fontSize: descriptionSize, textAlign: 'center' }}
          >
            By continuing, you certify that this passport belongs to you and is
            not stolen or forged.
          </Description>

          <YStack gap={buttonStackGap} width="100%" paddingTop={buttonPaddingTop}>
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
