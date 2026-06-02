// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import {
  BodyText,
  PrimaryButton,
  Title,
  YStack,
} from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  slate100,
  slate500,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import type { LoadErrorInfo } from '@selfxyz/rn-sdk';

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: slate100,
  },
});

export const WebViewLoadingOverlay: React.FC<{ stage: 'loading' | 'slow' }> = ({
  stage,
}) => (
  <YStack style={styles.fill} gap={16}>
    <ActivityIndicator size="large" color={black} />
    {stage === 'slow' ? (
      <BodyText style={{ color: slate500, textAlign: 'center' }}>
        Still loading…
      </BodyText>
    ) : null}
  </YStack>
);

export const WebViewErrorOverlay: React.FC<{ info: LoadErrorInfo }> = ({
  info,
}) => {
  const isTerminalVersionMismatch =
    info.kind === 'version_mismatch' && !info.canRetry;
  return (
    <YStack style={styles.fill} gap={12}>
      <Title style={{ textAlign: 'center' }}>
        {isTerminalVersionMismatch ? 'Update required' : 'Something went wrong'}
      </Title>
      <BodyText style={{ color: slate500, textAlign: 'center' }}>
        {isTerminalVersionMismatch
          ? 'Please update the Self app to continue.'
          : "We couldn't load verification. Check your connection and try again."}
      </BodyText>
      {info.canRetry ? (
        <YStack marginTop={16} alignSelf="stretch">
          <PrimaryButton onPress={info.onRetry}>Try again</PrimaryButton>
        </YStack>
      ) : null}
    </YStack>
  );
};
