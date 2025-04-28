/**
 * @format
 */
import React from 'react';
import { AppRegistry, LogBox, Platform } from 'react-native';

import messaging from '@react-native-firebase/messaging';
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

// Register background handler before the app is loaded
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);
});

// Configure foreground notifications
messaging().onMessage(async remoteMessage => {
  console.log('Foreground message received:', remoteMessage);

  if (Platform.OS === 'android') {
    // For Android, notifications in foreground must be handled manually
    // The notification will be automatically displayed when app is in background
    console.log('Android foreground notification:', remoteMessage.notification);
  } else if (Platform.OS === 'ios') {
    // iOS can show foreground notifications with permissions
    console.log('iOS foreground notification:', remoteMessage.notification);
  }
});

const Root = () => (
  <TamaguiProvider config={tamaguiConfig}>
    <ToastProvider swipeDirection="up">
      <App />
    </ToastProvider>
  </TamaguiProvider>
);

AppRegistry.registerComponent(appName, () => Root);
