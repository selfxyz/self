// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

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
