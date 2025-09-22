// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { StyleProp, TextStyle } from 'react-native';
import { styled, Text } from 'tamagui';

import { advercase } from '@/utils/fonts';

export const Title = styled(
  Text,
  {
    fontSize: 28,
    lineHeight: 35,
    fontFamily: advercase,
    variants: {
      size: {
        large: {
          fontSize: 38,
          lineHeight: 47,
        },
      },
    },
  },
  {
    acceptsClassName: true,
    style: (props: { style?: StyleProp<TextStyle> }) => props.style,
  },
);
