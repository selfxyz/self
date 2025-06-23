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

import { shouldShowAesopRedesign } from '../../hooks/useAesopRedesign';
import { slate400 } from '../../utils/colors';
import { dinot } from '../../utils/fonts';

interface AdditionalProps extends TextProps {}

const Additional = ({ children, style, ...props }: AdditionalProps) => {
  return (
    <Text {...props} style={[styles.additional, style]}>
      {children}
    </Text>
  );
};

export default Additional;

const styles = StyleSheet.create({
  additional: {
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center',
    color: slate400,
    marginTop: 10,
    fontFamily: dinot,
    textTransform: 'none',
    ...(shouldShowAesopRedesign() && {
      fontSize: 11.5,
      textTransform: 'uppercase',
    }),
  },
});
