// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { TextProps } from 'react-native';
import { StyleSheet, Text } from 'react-native';

import { slate700 } from '../../constants/colors';
import { dinot } from '../../constants/fonts';

type CautionProps = TextProps;

const Caution = ({ children, style, ...props }: CautionProps) => {
  return (
    <Text {...props} style={[styles.Caution, style]}>
      {children}
    </Text>
  );
};

export default Caution;

const styles = StyleSheet.create({
  Caution: {
    fontFamily: dinot,
    color: slate700,
    fontSize: 18,
    fontWeight: '500',
  },
});
