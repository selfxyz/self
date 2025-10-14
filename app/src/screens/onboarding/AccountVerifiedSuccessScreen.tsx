// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { useWindowDimensions } from 'react-native';
import { YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Description,
  PrimaryButton,
  Title,
} from '@selfxyz/mobile-sdk-alpha/components';
import { BackupEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import proofSuccessAnimation from '@/assets/animations/proof_success.json';
import { DelayedLottieView } from '@/components/DelayedLottieView';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import type { RootStackParamList } from '@/navigation';
import { styles } from '@/screens/verification/ProofRequestStatusScreen';
import { black, white } from '@/utils/colors';
import { buttonTap } from '@/utils/haptic';

const AccountVerifiedSuccessScreen: React.FC = ({}) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { bottom } = useSafeAreaInsets();

  const isCompact = screenWidth < 360 || screenHeight < 720;
  const topPadding = isCompact ? 24 : 40;
  const gap = isCompact ? 8 : 10;
  const stackMarginBottom = isCompact ? 12 : 20;
  const titleSize = isCompact ? 28 : 32;
  const descriptionSize = isCompact ? 15 : 16;
  const horizontalPadding = Math.max(16, screenWidth * 0.06);
  const bottomPadding = bottom + (isCompact ? 16 : 24);
  const contentBottomPadding = isCompact ? 12 : 20;

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
      <ExpandableBottomLayout.BottomSection
        backgroundColor={white}
        paddingBottom={bottomPadding}
      >
        <YStack
          paddingTop={topPadding}
          paddingHorizontal={horizontalPadding}
          paddingBottom={contentBottomPadding}
          justifyContent="center"
          alignItems="center"
          marginBottom={stackMarginBottom}
          gap={gap}
        >
          <Title size="large" style={{ fontSize: titleSize }}>
            ID Verified
          </Title>
          <Description style={{ fontSize: descriptionSize, textAlign: 'center' }}>
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
