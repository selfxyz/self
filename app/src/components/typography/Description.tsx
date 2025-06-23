//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import React from 'react';
import { StyleSheet } from 'react-native';
import { Text, TextProps } from 'tamagui';

import { shouldShowAesopRedesign } from '../../hooks/useAesopRedesign';
import { slate500 } from '../../utils/colors';
import { dinot } from '../../utils/fonts';

interface DescriptionProps extends TextProps {}

const Description = ({ children, style, ...props }: DescriptionProps) => {
  return (
    <Text
      {...props}
      textBreakStrategy="balanced"
      style={[styles.description, style]}
    >
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
    ...(shouldShowAesopRedesign() && {
      textAlign: 'left',
      fontSize: 16,
    }),
  },
});
