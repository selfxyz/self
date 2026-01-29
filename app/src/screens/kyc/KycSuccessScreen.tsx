// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { DelayedLottieView } from '@selfxyz/mobile-sdk-alpha';
import loadingAnimation from '@selfxyz/mobile-sdk-alpha/animations/loading/misc.json';
import {
  AbstractButton,
  Description,
  Title,
} from '@selfxyz/mobile-sdk-alpha/components';
import { black, white } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import { buttonTap } from '@/integrations/haptics';
import type { RootStackParamList } from '@/navigation';
import { requestNotificationPermission } from '@/services/notifications/notificationService';

const KycSuccessScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

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
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.centerSection}>
        <View style={styles.animationContainer}>
          <DelayedLottieView
            autoPlay
            loop={true}
            source={loadingAnimation}
            style={styles.animation}
            cacheComposition={true}
            renderMode="HARDWARE"
          />
        </View>
        <YStack
          paddingHorizontal={24}
          justifyContent="center"
          alignItems="center"
          gap={12}
        >
          <Title style={styles.title}>Your ID is being verified</Title>
          <Description style={styles.description}>
            Turn on push notifications to receive an update on your
            verification. It's also safe the close the app and come back later.
          </Description>
        </YStack>
      </View>
      <YStack gap={12} paddingHorizontal={20} paddingBottom={24}>
        <AbstractButton
          bgColor={white}
          color={black}
          onPress={handleReceiveUpdates}
        >
          Receive live updates
        </AbstractButton>
        <AbstractButton
          bgColor="transparent"
          color={white}
          borderColor="rgba(255, 255, 255, 0.3)"
          borderWidth={1}
          onPress={handleCheckLater}
        >
          I will check back later
        </AbstractButton>
      </YStack>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: black,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animationContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  animation: {
    width: 160,
    height: 160,
  },
  title: {
    color: white,
    textAlign: 'center',
    fontSize: 28,
    letterSpacing: 1,
  },
  description: {
    color: white,
    textAlign: 'center',
    fontSize: 18,
  },
});

export default KycSuccessScreen;
