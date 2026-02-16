// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Text, View, YStack } from 'tamagui';

export const ComingSoonScreen: React.FC = () => (
  <YStack flex={1} backgroundColor="#ffffff" alignItems="center" justifyContent="center">
    <View>
      <Text fontFamily="DINOT-Medium" fontSize={24} color="#333333">
        Coming Soon
      </Text>
    </View>
  </YStack>
);
