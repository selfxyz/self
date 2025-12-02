// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import type { TextProps } from 'react-native';
import { Text } from 'react-native';

import { dinot } from '../../constants/fonts';

export const DescriptionTitle: React.FC<TextProps> = ({ style, ...props }) => (
  <Text
    style={[
      {
        fontSize: 18,
        lineHeight: 35,
        fontFamily: dinot,
      },
      style,
    ]}
    {...props}
  />
);
