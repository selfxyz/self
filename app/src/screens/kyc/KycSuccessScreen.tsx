// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { StyleSheet } from 'react-native';
import { YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { DelayedLottieView } from '@selfxyz/mobile-sdk-alpha';
import loadingAnimation from '@selfxyz/mobile-sdk-alpha/animations/loading/misc.json';
import {
  Description,
  PrimaryButton,
  SecondaryButton,
  Title,
} from '@selfxyz/mobile-sdk-alpha/components';
import { black, white } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import { buttonTap } from '@/integrations/haptics';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import type { RootStackParamList } from '@/navigation';
import { requestNotificationPermission } from '@/services/notifications/notificationService';

const KycSuccessScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleReceiveUpdates = async () => {
    buttonTap();
    await requestNotificationPermission();
    // Navigate to Home regardless of permission result
    navigation.navigate('Home', {});
  };

  const handleCheckLater = () => {
    buttonTap();
    navigation.navigate('Home', {});
  };

  return (
    <ExpandableBottomLayout.Layout backgroundColor={white}>
      <ExpandableBottomLayout.TopSection backgroundColor={black} roundTop>
        <DelayedLottieView
          autoPlay
          loop={true}
          source={loadingAnimation}
          style={styles.animation}
          cacheComposition={true}
          renderMode="HARDWARE"
        />
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection backgroundColor={black}>
        <YStack
          paddingTop={40}
          paddingHorizontal={10}
          paddingBottom={20}
          justifyContent="center"
          alignItems="center"
          marginBottom={20}
          gap={10}
        >
          <Title size="large" style={styles.title}>
            Your ID is being verified
          </Title>
          <Description style={styles.description}>
            Turn on push notifications to receive an update on your
            verification. It's also safe the close the app and come back later.
          </Description>
        </YStack>
        <YStack gap={12} paddingBottom={20}>
          <PrimaryButton onPress={handleReceiveUpdates}>
            Receive live updates
          </PrimaryButton>
          <SecondaryButton textColor={white} onPress={handleCheckLater}>
            I will check back later
          </SecondaryButton>
        </YStack>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

const styles = StyleSheet.create({
  animation: {
    width: '125%',
    height: '125%',
  },
  title: {
    color: white,
  },
  description: {
    color: white,
  },
});

export default KycSuccessScreen;
