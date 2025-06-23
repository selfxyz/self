//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

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
