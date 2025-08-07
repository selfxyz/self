// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React from 'react';
import { createRoot } from 'react-dom/client';
import { TamaguiProvider, View } from 'tamagui';

import App from '../App';
import tamaguiConfig from '../tamagui.config.ts';

import 'react-native-get-random-values';
import './fonts.css';
import './reset.css';

const Root = () => (
  <TamaguiProvider config={tamaguiConfig}>
    <View flex={1} height="100vh" width="100%">
      <App />
    </View>
  </TamaguiProvider>
);

// Create root element and render the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Root />);
}
