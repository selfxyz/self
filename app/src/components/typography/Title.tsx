//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import { StyleProp, TextStyle } from 'react-native';
import { styled, Text } from 'tamagui';

import { advercase } from '../../utils/fonts';

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
