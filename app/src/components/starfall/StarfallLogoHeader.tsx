// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { View, XStack } from 'tamagui';

import { black, zinc800 } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import CheckmarkIcon from '@/assets/icons/checkmark_white.svg';
import OperaLogo from '@/assets/logos/opera_minipay.svg';
import SelfLogo from '@/assets/logos/self.svg';

export const StarfallLogoHeader: React.FC = () => (
  <XStack gap={10} alignItems="center" marginBottom={20}>
    {/* Opera MiniPay logo */}
    <View width={46} height={46} borderRadius={3} overflow="hidden">
      <OperaLogo width={46} height={46} />
    </View>

    {/* Checkmark icon */}
    <View width={32} height={32}>
      <CheckmarkIcon width={32} height={32} />
    </View>

    {/* Self logo */}
    <View
      width={46}
      height={46}
      backgroundColor={black}
      borderRadius={3}
      borderWidth={1}
      borderColor={zinc800}
      alignItems="center"
      justifyContent="center"
    >
      <SelfLogo width={28} height={28} />
    </View>
  </XStack>
);
