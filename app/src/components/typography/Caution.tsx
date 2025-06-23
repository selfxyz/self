//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';

import { slate700 } from '../../utils/colors';
import { dinot } from '../../utils/fonts';

interface CautionProps extends TextProps {}

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
