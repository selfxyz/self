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
import { ProofProvider } from './src/stores/proofProvider';
import useUserStore from './src/stores/userStore';
import { bgWhite } from './src/utils/colors';

global.Buffer = Buffer;

// Export the client variable (will be initialized later)
export let segmentClient: ReturnType<typeof createClient> | null = null;

function App(): React.JSX.Element {
  // const toast = useToastController();
  // const setToast = useNavigationStore(state => state.setToast);
  const initUserStore = useUserStore(state => state.initUserStore);
  // const setSelectedTab = useNavigationStore(state => state.setSelectedTab);

  // useEffect(() => {
  //   setToast(toast);
  // }, [toast, setToast]);

  // useEffect(() => {
  //   setSelectedTab('splash');
  // }, [setSelectedTab]);

  useEffect(() => {
    // init
    initUserStore();
    segmentClient = createSegmentClient();
    Orientation.lockToPortrait();
    // cleanup
    return () => {
      Orientation.unlockAllOrientations();
    };
  }, [initUserStore]);

  return (
    <YStack f={1} bc={bgWhite} h="100%" w="100%">
      <AppProvider>
        <AuthProvider>
          <ProofProvider>
            <AppNavigation />
          </ProofProvider>
        </AuthProvider>
      </AppProvider>
    </YStack>
  );
}

export default App;
