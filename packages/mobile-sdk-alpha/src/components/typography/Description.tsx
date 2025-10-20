// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { TextProps } from 'react-native';
import { StyleSheet, Text } from 'react-native';

import { slate500 } from '../../constants/colors';
import { dinot } from '../../constants/fonts';

type DescriptionProps = TextProps & {
  color?: string;
};

const Description = ({ children, style, color, ...props }: DescriptionProps) => {
  return (
    <Text {...props} textBreakStrategy="balanced" style={[styles.description, color ? { color } : {}, style]}>
      {children}
    </Text>
  );
};

export default Description;

const styles = StyleSheet.create({
  description: {
    color: slate500,
    fontSize: 18,
    lineHeight: 23,
    textAlign: 'center',
    fontFamily: dinot,
  },
});
