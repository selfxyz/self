// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import LottieView from 'lottie-react-native';
import React from 'react';
import { YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';

import { BackupEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import proofSuccessAnimation from '@/assets/animations/proof_success.json';
import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import Description from '@/components/typography/Description';
import { Title } from '@/components/typography/Title';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import { styles } from '@/screens/prove/ProofRequestStatusScreen';
import { black, white } from '@/utils/colors';
import { buttonTap } from '@/utils/haptic';

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
            Your document's information is now protected by Self ID. Just scan a
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
