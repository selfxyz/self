import React, { useEffect } from 'react';
import 'react-native-get-random-values';
import Orientation from 'react-native-orientation-locker';

import { createClient } from '@segment/analytics-react-native';
import { Buffer } from 'buffer';
import { YStack } from 'tamagui';

// Adjust the import path as needed
import AppNavigation from './src/Navigation';
import { createSegmentClient } from './src/Segment';
import { AppProvider } from './src/stores/appProvider';
import { AuthProvider } from './src/stores/authProvider';
import { PassportProvider } from './src/stores/passportDataProvider';
import { ProofProvider } from './src/stores/proofProvider';

global.Buffer = Buffer;

// Export the client variable (will be initialized later)
export let segmentClient: ReturnType<typeof createClient> | null = null;

function App(): React.JSX.Element {
  useEffect(() => {
    // init
    segmentClient = createSegmentClient();
    Orientation.lockToPortrait();
    // cleanup
    return () => {
      Orientation.unlockAllOrientations();
    };
  }, []);

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

export default App;
