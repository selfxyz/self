// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { StyleSheet, View } from 'react-native';

interface ButtonsContainerProps {
  children: React.ReactNode;
}

const ButtonsContainer = ({ children }: ButtonsContainerProps) => {
  return <View style={styles.buttonsContainer}>{children}</View>;
};

export default ButtonsContainer;

const styles = StyleSheet.create({
  buttonsContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
});
