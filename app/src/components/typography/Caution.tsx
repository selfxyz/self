// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React from 'react';
import type { TextProps } from 'react-native';
import { StyleSheet, Text } from 'react-native';

import { slate700 } from '@/utils/colors';
import { dinot } from '@/utils/fonts';

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
