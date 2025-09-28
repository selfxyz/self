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
import { AppRegistry } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import App from './App';
import { name as appName } from './app.json';
import { SelfClientProvider } from './src/selfClient/Provider';

import './src/utils/ethers';

// Set global Buffer before any other imports
global.Buffer = Buffer;

AppRegistry.registerComponent(appName, () => () => (
  <SafeAreaProvider>
    <SelfClientProvider>
      <App />
    </SelfClientProvider>
  </SafeAreaProvider>
));
