// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
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
