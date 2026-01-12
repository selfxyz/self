// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Image, Text, View, YStack } from 'tamagui';

import {
  advercase,
  dinot,
  plexMono,
} from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import { proofRequestColors } from '@/components/proof-request/designTokens';

export interface ProofRequestHeaderProps {
  logoSource: ImageSourcePropType | null;
  appName: string;
  appUrl: string | null;
  requestMessage: React.ReactNode;
  testID?: string;
}

/**
 * Black header section for proof request screens.
 * Displays app logo, name, URL, and request description.
 * Matches Figma design 15234:9267.
 */
export const ProofRequestHeader: React.FC<ProofRequestHeaderProps> = ({
  logoSource,
  appName,
  appUrl,
  requestMessage,
  testID = 'proof-request-header',
}) => {
  const hasLogo = logoSource !== null;

  return (
    <View
      backgroundColor={proofRequestColors.black}
      padding={30}
      gap={20}
      testID={testID}
    >
      {/* Logo and App Info Row */}
      <View flexDirection="row" alignItems="center" gap={20}>
        {logoSource && (
          <View
            width={50}
            height={50}
            borderRadius={3}
            overflow="hidden"
            testID={`${testID}-logo`}
          >
            <Image
              source={logoSource}
              width={50}
              height={50}
              objectFit="contain"
            />
          </View>
        )}
        <YStack>
          <Text
            fontFamily={advercase}
            fontSize={28}
            color={proofRequestColors.white}
            letterSpacing={1}
            testID={`${testID}-app-name`}
          >
            {appName}
          </Text>
          {appUrl && (
            <View marginRight={hasLogo ? 50 : 0}>
              <Text
                fontFamily={plexMono}
                fontSize={12}
                color={proofRequestColors.zinc500}
                testID={`${testID}-app-url`}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {appUrl}
              </Text>
            </View>
          )}
        </YStack>
      </View>

      {/* Request Description */}
      <Text
        fontFamily={dinot}
        fontSize={16}
        color={proofRequestColors.slate400}
        lineHeight={24}
        minHeight={75}
        testID={`${testID}-request-message`}
      >
        {requestMessage}
      </Text>
    </View>
  );
};
