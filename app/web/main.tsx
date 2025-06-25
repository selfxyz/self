import 'react-native-get-random-values';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Platform } from 'react-native';
console.warn('PLATFORM: ', Platform.OS);
import { AppRegistry } from 'react-native';
import { TamaguiProvider } from 'tamagui';

import App from '../App';
import tamaguiConfig from '../tamagui.config.ts';

const Root = () => (
  <TamaguiProvider config={tamaguiConfig}>
    <App />
  </TamaguiProvider>
);

AppRegistry.registerComponent('SelfWeb', () => Root);

// Create root element and render the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Root />);
}
