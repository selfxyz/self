import 'react-native-get-random-values';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { TamaguiProvider, View } from 'tamagui';

import App from '../App';
import { black } from '../src/utils/colors';
import tamaguiConfig from '../tamagui.config.ts';

const Root = () => (
  <TamaguiProvider config={tamaguiConfig}>
    <View backgroundColor={black} flex={1} height="100vh" width="100%">
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
