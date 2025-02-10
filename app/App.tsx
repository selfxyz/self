import React, { useEffect } from 'react';
import 'react-native-get-random-values';

import { createClient } from '@segment/analytics-react-native';
import { Buffer } from 'buffer';
import { YStack } from 'tamagui';

// Adjust the import path as needed
import AppNavigation from './src/Navigation';
import { createSegmentClient } from './src/Segment';
import { AuthProvider } from './src/stores/authProvider';
import useUserStore from './src/stores/userStore';
import { bgWhite } from './src/utils/colors';
import { setupUniversalLinkListener } from './src/utils/qrCode';

global.Buffer = Buffer;

// Export the client variable (will be initialized later)
export let segmentClient: ReturnType<typeof createClient> | null = null;

function App(): React.JSX.Element {
  // const toast = useToastController();
  // const setToast = useNavigationStore(state => state.setToast);
  const initUserStore = useUserStore(state => state.initUserStore);
  // const setSelectedTab = useNavigationStore(state => state.setSelectedTab);

  useEffect(() => {
    initUserStore();
  }, [initUserStore]);

  // useEffect(() => {
  //   setToast(toast);
  // }, [toast, setToast]);

  // useEffect(() => {
  //   setSelectedTab('splash');
  // }, [setSelectedTab]);

  useEffect(() => {
    const cleanup = setupUniversalLinkListener();
    return cleanup;
  }, []);

  useEffect(() => {
    // Initialize segment directly without any tracking checks
    segmentClient = createSegmentClient();
  }, []);

  return (
    <YStack f={1} bc={bgWhite} h="100%" w="100%">
      <AuthProvider>
        <AppNavigation />
      </AuthProvider>
    </YStack>
  );
}

export default App;
