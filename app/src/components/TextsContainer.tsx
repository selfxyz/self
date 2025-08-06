// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

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
