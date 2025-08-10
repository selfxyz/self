// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { shouldShowAesopRedesign } from '@/hooks/useAesopRedesign';

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
    flexDirection: shouldShowAesopRedesign() ? 'row' : 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
});
