//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { shouldShowAesopRedesign } from '../hooks/useAesopRedesign';

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
