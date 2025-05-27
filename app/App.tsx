import 'react-native-get-random-values';

import { Buffer } from 'buffer';
import React from 'react';
import { YStack } from 'tamagui';

import AppNavigation from './src/navigation';
import { initSentry, wrapWithSentry } from './src/Sentry';
import { AuthProvider } from './src/stores/authProvider';
import { DatabaseProvider } from './src/stores/databaseProvider';
import { PassportProvider } from './src/stores/passportDataProvider';

initSentry();

global.Buffer = Buffer;

function App(): React.JSX.Element {
  return (
    <YStack f={1} h="100%" w="100%">
      <AuthProvider>
        <PassportProvider>
          <DatabaseProvider>
            <AppNavigation />
          </DatabaseProvider>
        </PassportProvider>
      </AuthProvider>
    </YStack>
  );
}

export default wrapWithSentry(App);
