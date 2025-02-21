/**
 * @format
 */
import React from 'react';
import { AppRegistry, LogBox } from 'react-native';

import { config } from '@tamagui/config/v2-native';
import { ToastProvider } from '@tamagui/toast';
import { TamaguiProvider, createTamagui } from 'tamagui';

import App from './App';
import { name as appName } from './app.json';
import './src/utils/ethers';

const tamaguiConfig = createTamagui(config);

LogBox.ignoreLogs([
  /bad setState/,
  'Warning, duplicate ID for input',
  /Warning, duplicate ID for input/,
]);

const Root = () => (
  <TamaguiProvider config={tamaguiConfig}>
    <ToastProvider swipeDirection="up">
      <App />
    </ToastProvider>
  </TamaguiProvider>
);

AppRegistry.registerComponent(appName, () => Root);
