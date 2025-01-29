import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Image, YStack } from 'tamagui';

import Logo from '../images/logo.png';
import { ExpandableBottomLayout } from '../layouts/ExpandableBottomLayout';
import { PrimaryButton } from '../components/buttons/PrimaryButton';
import { slate50, slate100, slate700, slate500 } from '../utils/colors';
import { useNavigation } from '@react-navigation/native';

interface AccountRecoveryScreenProps {}

const AccountRecoveryScreen: React.FC<AccountRecoveryScreenProps> = ({}) => {
  const navigation = useNavigation();

  return (
    <ExpandableBottomLayout.Layout>
      <ExpandableBottomLayout.TopSection>
        <Image src={Logo} />
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection>
        <YStack gap="$2.5">
          <Text style={styles.subheader}>
            By continuing, you certify that this passport belongs to you and is
            not stolen or forged.
          </Text>
          <PrimaryButton onPress={() => navigation.navigate('TODO: restore')}>
            Restore my account
          </PrimaryButton>
          <PrimaryButton
            onPress={() => navigation.navigate('PassportOnboarding')}
          >
            Create new account
          </PrimaryButton>
        </YStack>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default AccountRecoveryScreen;

const styles = StyleSheet.create({
  subheader: {
    color: slate700,
    // fontWeight: '500',
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
  },
  link: {
    textDecorationLine: 'underline',
  },
  notice: {
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 20,
    paddingRight: 20,
    backgroundColor: slate50,
    borderColor: slate100,
    borderWidth: 1,
    borderStyle: 'solid',
    color: slate500,
    textAlign: 'center',
    lineHeight: 18,
  },
});
