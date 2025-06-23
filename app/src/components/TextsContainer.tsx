//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

interface TextsContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

const TextsContainer = ({ children, style }: TextsContainerProps) => {
  return <View style={[styles.textsContainer, style]}>{children}</View>;
};

export default TextsContainer;

const styles = StyleSheet.create({
  textsContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
});
