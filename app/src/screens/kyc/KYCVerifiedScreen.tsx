// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  AbstractButton,
  Description,
  Title,
} from '@selfxyz/mobile-sdk-alpha/components';
import { black, white } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import { buttonTap } from '@/integrations/haptics';
import type { RootStackParamList } from '@/navigation';

const KYCVerifiedScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const handleGenerateProof = () => {
    buttonTap();
    navigation.navigate('ProvingScreenRouter');
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.spacer} />
      <YStack
        paddingHorizontal={24}
        justifyContent="center"
        alignItems="center"
        gap={12}
        marginBottom={64}
      >
        <Title style={styles.title}>Your ID has been verified</Title>
        <Description style={styles.description}>
          Next Self will generate a zk proof specifically for this device that
          you can use to proof your identity.
        </Description>
      </YStack>
      <YStack gap={12} paddingHorizontal={20} paddingBottom={24}>
        <AbstractButton
          bgColor={white}
          color={black}
          onPress={handleGenerateProof}
        >
          Generate proof
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
  spacer: {
    flex: 1,
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
    lineHeight: 27,
  },
});

export default KYCVerifiedScreen;
