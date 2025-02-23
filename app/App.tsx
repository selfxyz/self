import React from 'react';
import 'react-native-get-random-values';

import { Buffer } from 'buffer';
import { YStack } from 'tamagui';

import AppNavigation from './src/Navigation';
import { initSentry, wrapWithSentry } from './src/Sentry';
import { AppProvider } from './src/stores/appProvider';
import { AuthProvider } from './src/stores/authProvider';
import { PassportProvider } from './src/stores/passportDataProvider';
import { ProofProvider } from './src/stores/proofProvider';

initSentry();

global.Buffer = Buffer;

function App(): React.JSX.Element {
  return (
    <YStack f={1} h="100%" w="100%">
      <AuthProvider>
        <PassportProvider>
          <AppProvider>
            <ProofProvider>
              <AppNavigation />
            </ProofProvider>
          </AppProvider>
        </PassportProvider>
      </AuthProvider>
    </YStack>
  );
}

export default wrapWithSentry(App);
