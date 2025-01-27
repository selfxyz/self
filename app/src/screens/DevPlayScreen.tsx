import React from 'react';
import { PrimaryButton } from '../components/buttons/PrimaryButton';
import { SecondaryButton } from '../components/buttons/SecondaryButton';
import { Text, XStack, YStack } from 'tamagui';
import { View } from 'react-native';
import { white } from '../utils/colors';

const DevPlayScreen = () => {
  return (
    <YStack ai="center" f={1} gap="$8" mt="$18" mb="$8">
      <View
        style={{
          padding: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          width: '100%',
          backgroundColor: white,
        }}
      >
        <Text fontSize="$9">Hello PASSPORT</Text>
        <PrimaryButton>Primary Button</PrimaryButton>
        <PrimaryButton disabled>Primary Button Disabled</PrimaryButton>

        <SecondaryButton>Secondary Button</SecondaryButton>
        <SecondaryButton disabled>Secondary Button Disabled</SecondaryButton>
      </View>
      <XStack f={1} />
    </YStack>
  );
};

export default DevPlayScreen;
