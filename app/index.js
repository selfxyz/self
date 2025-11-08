// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * @format
 */

// CRITICAL: Import crypto polyfill FIRST, before any modules that use crypto/uuid
// eslint-disable-next-line simple-import-sort/imports
import 'react-native-get-random-values';

import { Buffer } from 'buffer';
import React from 'react';
import { AppRegistry, LogBox } from 'react-native';
import { TamaguiProvider } from 'tamagui';

import App from './App';
import { name as appName } from './app.json';
import tamaguiConfig from './tamagui.config';

import './src/utils/crypto/ethers';
import 'react-native-gesture-handler';

// Set global Buffer before any other imports
global.Buffer = Buffer;

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
