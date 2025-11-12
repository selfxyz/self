// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { DelayedLottieView } from '@selfxyz/mobile-sdk-alpha';
import {
  Description,
  PrimaryButton,
  Title,
} from '@selfxyz/mobile-sdk-alpha/components';
import { BackupEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import { black, white } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import proofSuccessAnimation from '@/assets/animations/proof_success.json';
import { buttonTap } from '@/integrations/haptics';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import type { RootStackParamList } from '@/navigation';
import { styles } from '@/screens/verification/ProofRequestStatusScreen';

const AccountVerifiedSuccessScreen: React.FC = ({}) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <ExpandableBottomLayout.Layout backgroundColor={white}>
      <ExpandableBottomLayout.TopSection backgroundColor={black} roundTop>
        <DelayedLottieView
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
            navigation.navigate({ name: 'Home', params: {} });
          }}
        >
          Continue
        </PrimaryButton>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default AccountVerifiedSuccessScreen;
