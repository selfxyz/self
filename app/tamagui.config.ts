// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { createFont, createTamagui } from 'tamagui';
import { config } from '@tamagui/config/v3';

const commonSizes = {
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
};

const commonLineHeights = {
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
};

const commonLetterSpacing = { 4: 0 };

function makeFont(family: string, weight: Record<number, string>) {
  return createFont({
    family,
    size: commonSizes,
    lineHeight: commonLineHeights,
    weight,
    letterSpacing: commonLetterSpacing,
  });
}

const advercaseFont = makeFont('Advercase-Regular', { 4: '400' });
const dinotFont = makeFont('DINOT-Medium', { 4: '400', 5: '500' });
const plexMonoFont = makeFont('IBMPlexMono-Regular', { 4: '400' });

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

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends AppConfig {}
}

export default appConfig;
