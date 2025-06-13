/**
 * @format
 */
import './src/utils/ethers';

import { ToastProvider } from '@tamagui/toast';
import React from 'react';
import { AppRegistry, LogBox } from 'react-native';
import { TamaguiProvider } from 'tamagui';

import App from './App';
import { name as appName } from './app.json';
import appConfig from './tamagui.config';

LogBox.ignoreLogs([
  /bad setState/,
  'Warning, duplicate ID for input',
  /Warning, duplicate ID for input/,
]);

const Root = () => (
  <TamaguiProvider config={appConfig}>
    <ToastProvider swipeDirection="up">
      <App />
    </ToastProvider>
  </TamaguiProvider>
);

AppRegistry.registerComponent(appName, () => Root);
