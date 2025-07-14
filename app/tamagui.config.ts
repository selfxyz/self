// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { config } from '@tamagui/config/v3';
import { createFont, createTamagui } from 'tamagui';

// or '@tamagui/core'

const advercaseFont = createFont({
  family: 'Advercase-Regular',
  size: {
    1: 12,
    2: 14,
    3: 15,
    4: 16,
    5: 18,
    6: 20,
    7: 24,
    8: 28,
    9: 32,
    10: 40,
    11: 52,
    12: 62,
    13: 72,
    14: 92,
    15: 114,
    16: 134,
  },
  lineHeight: {
    1: 16,
    2: 20,
    3: 22,
    4: 24,
    5: 26,
    6: 28,
    7: 32,
    8: 36,
    9: 40,
    10: 48,
    11: 60,
    12: 70,
    13: 80,
    14: 100,
    15: 122,
    16: 142,
  },
  weight: {
    4: '400',
  },
  letterSpacing: {
    4: 0,
  },
});

const dinotFont = createFont({
  family: 'DINOT-Medium',
  size: {
    1: 12,
    2: 14,
    3: 15,
    4: 16,
    5: 18,
    6: 20,
    7: 24,
    8: 28,
    9: 32,
    10: 40,
    11: 52,
    12: 62,
    13: 72,
    14: 92,
    15: 114,
    16: 134,
  },
  lineHeight: {
    1: 16,
    2: 20,
    3: 22,
    4: 24,
    5: 26,
    6: 28,
    7: 32,
    8: 36,
    9: 40,
    10: 48,
    11: 60,
    12: 70,
    13: 80,
    14: 100,
    15: 122,
    16: 142,
  },
  weight: {
    4: '400',
    5: '500',
  },
  letterSpacing: {
    4: 0,
  },
});

const plexMonoFont = createFont({
  family: 'IBMPlexMono-Regular',
  size: {
    1: 12,
    2: 14,
    3: 15,
    4: 16,
    5: 18,
    6: 20,
    7: 24,
    8: 28,
    9: 32,
    10: 40,
    11: 52,
    12: 62,
    13: 72,
    14: 92,
    15: 114,
    16: 134,
  },
  lineHeight: {
    1: 16,
    2: 20,
    3: 22,
    4: 24,
    5: 26,
    6: 28,
    7: 32,
    8: 36,
    9: 40,
    10: 48,
    11: 60,
    12: 70,
    13: 80,
    14: 100,
    15: 122,
    16: 142,
  },
  weight: {
    4: '400',
  },
  letterSpacing: {
    4: 0,
  },
});

const appConfig = createTamagui({
  ...config,
  fonts: {
    ...config.fonts,
    advercase: advercaseFont,
    dinot: dinotFont,
    plexMono: plexMonoFont,
  },
});

export type AppConfig = typeof appConfig;

declare module 'tamagui' {
  // or '@tamagui/core'
  // overrides TamaguiCustomConfig so your custom types
  // work everywhere you import `tamagui`
  interface TamaguiCustomConfig extends AppConfig {}
}

export default appConfig;
