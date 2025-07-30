// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React from 'react';
import { Platform } from 'react-native';
import { YStack } from 'tamagui';

// Simple loading component without navigation dependencies
// Only used on web platform as a Suspense fallback
const SimpleLoadingFallback = () => {
  // Only render on web platform
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <YStack flex={1} height="100%" width="100%" justifyContent="center" alignItems="center">
      <div>Loading...</div>
    </YStack>
  );
};

export default SimpleLoadingFallback;
