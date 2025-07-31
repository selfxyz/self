// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React from 'react';
import { StatusBar, StatusBarStyle } from 'react-native';

export interface SystemBarsProps {
  style?: 'light' | 'dark';
}

const SystemBars: React.FC<SystemBarsProps> = ({ style = 'light' }) => {
  const barStyle: StatusBarStyle = style === 'light' ? 'light-content' : 'dark-content';
  return <StatusBar barStyle={barStyle} />;
};

export default SystemBars;
