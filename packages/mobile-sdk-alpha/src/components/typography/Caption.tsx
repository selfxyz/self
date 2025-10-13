// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useMemo } from 'react';
import { StyleSheet, type TextProps } from 'react-native';

import { slate400 } from '../../constants/colors';
import { BodyText } from './BodyText';

type CaptionProps = TextProps & {
  size?: 'small' | 'large';
};

export const Caption: React.FC<CaptionProps> = ({ size, style, ...props }) => {
  const fontSize = size === 'small' ? 14 : size === 'large' ? 16 : 15;
  const flattenedStyle = useMemo(() => StyleSheet.flatten([{ fontSize, color: slate400 }, style]), [fontSize, style]);

  return <BodyText style={flattenedStyle} {...props} />;
};
