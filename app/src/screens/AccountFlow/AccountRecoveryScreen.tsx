import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import RestoreAccountSvg from '../../images/icons/restore_account.svg';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { black, slate600, white } from '../../utils/colors';
import React from 'react';
import { View, YStack } from 'tamagui';

interface AccountRecoveryScreenProps {}

const AccountRecoveryScreen: React.FC<AccountRecoveryScreenProps> = ({}) => {
  const onRestoreAccountPress = useHapticNavigation('AccountRecoveryChoice');
  const onCreateAccountPress = useHapticNavigation('SaveRecoveryPhrase');

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
            <PrimaryButton onPress={onRestoreAccountPress}>
              Restore my account
            </PrimaryButton>
            <SecondaryButton onPress={onCreateAccountPress}>
              Create new account
            </SecondaryButton>
          </YStack>
        </YStack>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default AccountRecoveryScreen;
