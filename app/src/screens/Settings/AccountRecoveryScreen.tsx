import React from 'react';

import { View, YStack } from 'tamagui';

import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import RestoreAccountSvg from '../../images/icons/restore_account.svg';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { slate600, white } from '../../utils/colors';

interface AccountRecoveryScreenProps {}

const AccountRecoveryScreen: React.FC<AccountRecoveryScreenProps> = ({}) => {
  const onRestorePress = useHapticNavigation('TODO: restore');
  const onShowRecoveryPhrasePress = useHapticNavigation('ShowRecoveryPhrase');

  return (
    <ExpandableBottomLayout.Layout>
      <ExpandableBottomLayout.TopSection>
        <View borderColor={slate600} borderWidth="$1" borderRadius="$10" p="$5">
          <RestoreAccountSvg height={80} width={80} color={white} />
        </View>
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection>
        <YStack alignItems="center" gap="$2.5" pb="$2.5">
          <Title>Restore your Self ID account</Title>
          <Description>
            By continuing, you certify that this passport belongs to you and is
            not stolen or forged.
          </Description>

          <YStack gap="$2.5" width="100%" pt="$6">
            <PrimaryButton onPress={onRestorePress}>
              Restore my account
            </PrimaryButton>
            <SecondaryButton onPress={onShowRecoveryPhrasePress}>
              Create new account
            </SecondaryButton>
          </YStack>
        </YStack>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default AccountRecoveryScreen;
