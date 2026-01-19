// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Pressable } from 'react-native';
import { Text, View, XStack } from 'tamagui';

import { plexMono } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import { proofRequestColors } from '@/components/proof-request/designTokens';
import { WalletIcon } from '@/components/proof-request/icons';

export interface ConnectedWalletBadgeProps {
  address: string;
  userIdType?: string;
  onToggle?: () => void;
  testID?: string;
}

/**
 * Blue badge showing connected wallet address.
 * Matches Figma design 15234:9295 (icon).
 */
export const ConnectedWalletBadge: React.FC<ConnectedWalletBadgeProps> = ({
  address,
  userIdType,
  onToggle,
  testID = 'connected-wallet-badge',
}) => {
  const label = userIdType === 'hex' ? 'Connected Wallet' : 'Connected ID';

  const content = (
    <XStack
      backgroundColor={proofRequestColors.blue600}
      paddingLeft={10}
      paddingRight={20}
      paddingVertical={12}
      borderRadius={4}
      alignItems="center"
      gap={10}
      testID={testID}
    >
      {/* Label with icon */}
      <XStack
        backgroundColor={proofRequestColors.blue700}
        paddingHorizontal={6}
        paddingVertical={4}
        borderRadius={3}
        alignItems="center"
        gap={6}
      >
        <WalletIcon size={11} color={proofRequestColors.white} />
        <Text
          fontFamily={plexMono}
          fontSize={12}
          color={proofRequestColors.white}
          textTransform="uppercase"
        >
          {label}
        </Text>
      </XStack>

      {/* Address */}
      <View flex={1}>
        <Text
          fontFamily={plexMono}
          fontSize={12}
          color={proofRequestColors.white}
          textAlign="right"
          testID={`${testID}-address`}
        >
          {truncateAddress(address)}
        </Text>
      </View>
    </XStack>
  );

  if (onToggle) {
    return (
      <Pressable onPress={onToggle} testID={`${testID}-pressable`}>
        {content}
      </Pressable>
    );
  }

  return content;
};

/**
 * Truncates a wallet address for display.
 * @example truncateAddress("0x1234567890abcdef1234567890abcdef12345678") // "0x12..5678"
 */
export function truncateAddress(
  address: string,
  startChars = 4,
  endChars = 4,
): string {
  if (address.length <= startChars + endChars + 2) {
    return address;
  }
  return `${address.slice(0, startChars)}..${address.slice(-endChars)}`;
}
