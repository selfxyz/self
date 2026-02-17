// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import ReactDOM from 'react-dom/client';
import { TamaguiProvider, View } from 'tamagui';
import tamaguiConfig from '../tamagui.config';
import { App } from './App';
import { BridgeProvider } from './providers/BridgeProvider';
import './fonts.css';
import './reset.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TamaguiProvider config={tamaguiConfig}>
      <View flex={1} height="100vh" width="100%">
        <BridgeProvider>
          <App />
        </BridgeProvider>
      </View>
    </TamaguiProvider>
  </React.StrictMode>,
);
