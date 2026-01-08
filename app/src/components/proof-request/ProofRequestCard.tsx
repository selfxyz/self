// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import type { ImageSourcePropType } from 'react-native';
import { ScrollView } from 'react-native';
import { Text, View } from 'tamagui';

import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import {
  proofRequestColors,
  proofRequestSpacing,
} from '@/components/proof-request/designTokens';
import {
  formatTimestamp,
  ProofMetadataBar,
} from '@/components/proof-request/ProofMetadataBar';
import { ProofRequestHeader } from '@/components/proof-request/ProofRequestHeader';

export interface ProofRequestCardProps {
  logoSource: ImageSourcePropType | null;
  appName: string;
  appUrl: string | null;
  documentType?: string;
  timestamp?: Date;
  children?: React.ReactNode;
  testID?: string;
}

/**
 * Main card container for proof request screens.
 * Combines header, metadata bar, and content section.
 * Matches Figma design 15234:9267.
 */
export const ProofRequestCard: React.FC<ProofRequestCardProps> = ({
  logoSource,
  appName,
  appUrl,
  documentType = 'Passport',
  timestamp = new Date(),
  children,
  testID = 'proof-request-card',
}) => {
  // Build request message with highlighted app name and document type
  const requestMessage = (
    <>
      <Text color={proofRequestColors.white} fontFamily={dinot}>
        {appName}
      </Text>
      <Text color={proofRequestColors.slate400} fontFamily={dinot}>
        {
          ' is requesting access to the following information from your verified '
        }
      </Text>
      <Text color={proofRequestColors.white} fontFamily={dinot}>
        {documentType}
      </Text>
      <Text color={proofRequestColors.slate400} fontFamily={dinot}>
        .
      </Text>
    </>
  );

  return (
    <View flex={1} paddingVertical={20} paddingHorizontal={20} testID={testID}>
      <View
        borderRadius={proofRequestSpacing.borderRadius}
        borderWidth={1}
        borderColor={proofRequestColors.slate200}
        overflow="hidden"
        flex={1}
      >
        {/* Black Header */}
        <ProofRequestHeader
          logoSource={logoSource}
          appName={appName}
          appUrl={appUrl}
          requestMessage={requestMessage}
          testID={`${testID}-header`}
        />

        {/* Metadata Bar */}
        <ProofMetadataBar
          timestamp={formatTimestamp(timestamp)}
          testID={`${testID}-metadata`}
        />

        {/* White Content Area */}
        <View
          flex={1}
          backgroundColor={proofRequestColors.slate100}
          padding={proofRequestSpacing.cardPadding}
          borderBottomLeftRadius={proofRequestSpacing.borderRadius}
          borderBottomRightRadius={proofRequestSpacing.borderRadius}
        >
          <ScrollView
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </View>
  );
};
