// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import LottieView from 'lottie-react-native';
import React from 'react';
import { YStack } from 'tamagui';

import { useNavigation } from '@react-navigation/native';
import proofSuccessAnimation from '@src/assets/animations/proof_success.json';
import { PrimaryButton } from '@src/components/buttons/PrimaryButton';
import Description from '@src/components/typography/Description';
import { Title } from '@src/components/typography/Title';
import { BackupEvents } from '@src/consts/analytics';
import { ExpandableBottomLayout } from '@src/layouts/ExpandableBottomLayout';
import { styles } from '@src/screens/prove/ProofRequestStatusScreen';
import { black, white } from '@src/utils/colors';
import { buttonTap } from '@src/utils/haptic';

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
          paddingTop={40}
          paddingHorizontal={10}
          paddingBottom={20}
          justifyContent="center"
          alignItems="center"
          marginBottom={20}
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
