import { useNavigation } from '@react-navigation/native';
import Description from '@selfxyz/ui/dist/typography/Description';
import { Title } from '@selfxyz/ui/dist/typography/Title';
import { black, white } from '@selfxyz/ui/dist/utils/colors';
import LottieView from 'lottie-react-native';
import React from 'react';
import { YStack } from 'tamagui';

import proofSuccessAnimation from '../../assets/animations/proof_success.json';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { BackupEvents } from '../../consts/analytics';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { buttonTap } from '@selfxyz/ui/src/utils/haptic';
import { styles } from '../prove/ProofRequestStatusScreen';

const AccountVerifiedSuccessScreen: React.FC = ({}) => {
  const navigation = useNavigation();

  return (
    <ExpandableBottomLayout.Layout backgroundColor={white}>
      <ExpandableBottomLayout.TopSection backgroundColor={black} roundTop>
        <LottieView
          autoPlay
          loop={false}
          source={proofSuccessAnimation}
          style={styles.animation}
          cacheComposition={true}
          renderMode="HARDWARE"
        />
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection backgroundColor={white}>
        <YStack
          pt={40}
          px={10}
          pb={20}
          jc="center"
          ai="center"
          mb={20}
          gap={10}
        >
          <Title size="large">ID Verified</Title>
          <Description>
            Your passport information is now protected by Self ID. Just scan a
            participating partner's QR code to prove your identity.
          </Description>
        </YStack>
        <PrimaryButton
          trackEvent={BackupEvents.ACCOUNT_VERIFICATION_COMPLETED}
          onPress={() => {
            buttonTap();
            navigation.navigate('Home');
          }}
        >
          Continue
        </PrimaryButton>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default AccountVerifiedSuccessScreen;
