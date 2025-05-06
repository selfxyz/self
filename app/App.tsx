import 'react-native-get-random-values';

import { Buffer } from 'buffer';
import React, { useEffect } from 'react';
import { YStack } from 'tamagui';

import AppNavigation from './src/Navigation';
import { initSentry, wrapWithSentry } from './src/Sentry';
import NotificationHandler from './src/components/notifications/NotificationHandler';
import { initializeFirebase } from './src/firebase/firebase-config';
import { AuthProvider } from './src/stores/authProvider';
import { DatabaseProvider } from './src/stores/databaseProvider';
import { PassportProvider } from './src/stores/passportDataProvider';

initSentry();

global.Buffer = Buffer;

function App(): React.JSX.Element {
  // Initialize Firebase when the app starts
  useEffect(() => {
    const setupFirebase = async () => {
      try {
        await initializeFirebase();
      } catch (error) {
        console.error('Failed to initialize Firebase:', error);
      }
    };

    setupFirebase();
  }, []);

  return (
    <YStack f={1} h="100%" w="100%">
      <AuthProvider>
        <PassportProvider>
          <DatabaseProvider>
            <NotificationHandler />
            <AppNavigation />
          </DatabaseProvider>
        </PassportProvider>
      </AuthProvider>
    </YStack>
  );
}

export default wrapWithSentry(App);
