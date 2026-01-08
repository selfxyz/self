// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Text, View, XStack } from 'tamagui';

import { plexMono } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import { proofRequestColors } from '@/components/proof-request/designTokens';
import { DocumentIcon } from '@/components/proof-request/icons';

export interface ProofMetadataBarProps {
  timestamp: string;
  testID?: string;
}

/**
 * Gray metadata bar showing "PROOFS REQUESTED" label and timestamp.
 * Matches Figma design 15234:9267.
 */
export const ProofMetadataBar: React.FC<ProofMetadataBarProps> = ({
  timestamp,
  testID = 'proof-metadata-bar',
}) => {
  return (
    <View
      backgroundColor={proofRequestColors.slate200}
      paddingVertical={8}
      paddingHorizontal={16}
      borderBottomWidth={1}
      borderBottomColor={proofRequestColors.slate200}
      testID={testID}
    >
      <XStack gap={8} alignItems="center" width="100%">
        {/* Document icon */}
        <DocumentIcon size={18} color={proofRequestColors.slate400} />

        <Text
          fontFamily={plexMono}
          fontSize={12}
          color={proofRequestColors.slate400}
          textTransform="uppercase"
          flex={1}
        >
          Proofs Requested
        </Text>

        <Text
          fontFamily={plexMono}
          fontSize={12}
          color={proofRequestColors.slate400}
        >
          •
        </Text>

        <Text
          fontFamily={plexMono}
          fontSize={12}
          color={proofRequestColors.slate400}
          testID={`${testID}-timestamp`}
        >
          {timestamp}
        </Text>
      </XStack>
    </View>
  );
};

/**
 * Formats a Date object to match the Figma timestamp format.
 * @example formatTimestamp(new Date()) // "4/7/2025 11:44 AM"
 */
export function formatTimestamp(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');

  return `${month}/${day}/${year} ${displayHours}:${displayMinutes} ${ampm}`;
}
