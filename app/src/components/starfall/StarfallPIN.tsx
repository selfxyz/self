// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { white } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

export interface StarfallPINProps {
  code: string;
}

export const StarfallPIN: React.FC<StarfallPINProps> = ({ code }) => {
  // Split the code into individual digits (expects 4 digits)
  const digits = code.split('').slice(0, 4);

  // Pad with empty strings if less than 4 digits
  while (digits.length < 4) {
    digits.push('');
  }

  return (
    <XStack
      gap={6}
      alignItems="center"
      justifyContent="center"
      padding={4}
      borderRadius={12}
      borderWidth={1}
      borderColor="#52525b"
      backgroundColor="rgba(0, 0, 0, 0.4)"
      width="100%"
    >
      {digits.map((digit, index) => (
        <YStack
          key={index}
          flex={1}
          height={80}
          alignItems="center"
          justifyContent="center"
          borderRadius={8}
          borderWidth={1}
          borderColor="rgba(255, 255, 255, 0.2)"
          paddingHorizontal={12}
        >
          <Text
            fontFamily={dinot}
            fontSize={32}
            fontWeight="500"
            color={white}
            letterSpacing={-1}
            lineHeight={32}
          >
            {digit}
          </Text>
        </YStack>
      ))}
    </XStack>
  );
};
