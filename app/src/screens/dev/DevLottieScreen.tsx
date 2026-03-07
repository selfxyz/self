// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import type { DotLottieSource } from '@selfxyz/mobile-sdk-alpha';
import { LottieAnimation } from '@selfxyz/mobile-sdk-alpha';
import { black, white } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

/* eslint-disable @typescript-eslint/no-require-imports -- binary assets loaded by Metro */
const proofSuccess = require('@/assets/animations/proof_success.lottie');
const proofFailed = require('@/assets/animations/proof_failed.lottie');
const youWin = require('@selfxyz/mobile-sdk-alpha/animations/loading/youWin.lottie');
const sdkSuccess = require('@selfxyz/mobile-sdk-alpha/animations/loading/success.lottie');
const sdkFail = require('@selfxyz/mobile-sdk-alpha/animations/loading/fail.lottie');
const prove = require('@selfxyz/mobile-sdk-alpha/animations/loading/prove.lottie');
/* eslint-enable @typescript-eslint/no-require-imports */

const animations: { label: string; source: DotLottieSource }[] = [
  { label: 'proof_success', source: proofSuccess },
  { label: 'proof_failed', source: proofFailed },
  { label: 'youWin', source: youWin },
  { label: 'sdk success', source: sdkSuccess },
  { label: 'sdk fail', source: sdkFail },
  { label: 'prove', source: prove },
];

const DevLottieScreen: React.FC = () => {
  const [selected, setSelected] = useState(0);
  const [key, setKey] = useState(0);

  const current = animations[selected]!;

  return (
    <YStack flex={1} backgroundColor={black}>
      <YStack flex={1} alignItems="center" justifyContent="center">
        <LottieAnimation
          key={key}
          autoPlay
          loop={false}
          source={current.source}
          style={styles.animation}
          cacheComposition={false}
          renderMode="HARDWARE"
        />
      </YStack>
      <XStack flexWrap="wrap" gap={8} padding={16} justifyContent="center">
        {animations.map((anim, i) => (
          <Pressable
            key={anim.label}
            onPress={() => {
              setSelected(i);
              setKey(k => k + 1);
            }}
            style={[styles.chip, i === selected && styles.chipActive]}
          >
            <Text
              fontFamily={dinot}
              fontSize={13}
              color={i === selected ? black : white}
            >
              {anim.label}
            </Text>
          </Pressable>
        ))}
      </XStack>
      <Pressable
        onPress={() => setKey(k => k + 1)}
        style={styles.replayButton}
      >
        <Text fontFamily={dinot} fontSize={16} color={black}>
          Replay
        </Text>
      </Pressable>
    </YStack>
  );
};

export default DevLottieScreen;

const styles = StyleSheet.create({
  animation: {
    width: '100%',
    height: '100%',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: white,
  },
  chipActive: {
    backgroundColor: white,
  },
  replayButton: {
    marginHorizontal: 16,
    marginBottom: 40,
    backgroundColor: white,
    borderRadius: 60,
    padding: 14,
    alignItems: 'center',
  },
});
