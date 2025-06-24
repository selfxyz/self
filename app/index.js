// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

/**
 * @format
 */
import './src/utils/ethers';

import { config } from '@tamagui/config/v2-native';
import React from 'react';
import { AppRegistry, LogBox } from 'react-native';
import { createTamagui, TamaguiProvider } from 'tamagui';

import App from './App';
import { name as appName } from './app.json';

const tamaguiConfig = createTamagui(config);

LogBox.ignoreLogs([
  /bad setState/,
  'Warning, duplicate ID for input',
  /Warning, duplicate ID for input/,
]);

const Root = () => (
  <TamaguiProvider config={tamaguiConfig}>
    <App />
  </TamaguiProvider>
);

AppRegistry.registerComponent(appName, () => Root);
