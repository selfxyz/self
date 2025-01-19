import 'react-native-get-random-values';
import '@ethersproject/shims';
import { Buffer } from 'buffer';
import { NativeModules, Platform } from 'react-native';

global.Buffer = Buffer;

import React, { useEffect } from 'react';
import * as amplitude from '@amplitude/analytics-react-native';
import { AMPLITUDE_KEY, SEGMENT_KEY } from '@env';
import { useToastController } from '@tamagui/toast';
import { YStack } from 'tamagui';
import { createClient } from '@segment/analytics-react-native';
import { requestTrackingPermission } from 'react-native-tracking-transparency';

import MainScreen from './src/screens/MainScreen';
import useNavigationStore from './src/stores/navigationStore';
import useUserStore from './src/stores/userStore';
import { bgWhite } from './src/utils/colors';
import { setupUniversalLinkListener } from './src/utils/qrCode'; // Adjust the import path as needed

// Remove the segment client creation from here
// Instead export a function to create it
export const createSegmentClient = () =>
  SEGMENT_KEY ? createClient({
    writeKey: SEGMENT_KEY,
    trackAppLifecycleEvents: true,
    trackDeepLinks: true,
    debug: true,
  }) : null;

// Export the client variable (will be initialized later)
export let segmentClient: ReturnType<typeof createClient> | null = null;

function App(): React.JSX.Element {
  const toast = useToastController();
  const { setToast, setSelectedTab, trackEvent } = useNavigationStore();
  const initUserStore = useUserStore(state => state.initUserStore);

  useEffect(() => {
    initUserStore();
  }, [initUserStore]);

  useEffect(() => {
    setToast(toast);
  }, [toast, setToast]);

  useEffect(() => {
    setSelectedTab('splash');
  }, [setSelectedTab]);

  useEffect(() => {
    const cleanup = setupUniversalLinkListener();
    return cleanup;
  }, []);

  useEffect(() => {
    const requestTracking = async () => {
      if (Platform.OS === 'ios') {
        const status = await requestTrackingPermission();
        console.log('Tracking permission status:', status);
        // Initialize segment client after getting tracking permission
        if (status === 'authorized') {
          segmentClient = createSegmentClient();
        }
      } else {
        // On Android, initialize directly
        segmentClient = createSegmentClient();
      }
    };

    requestTracking();
  }, []);

  return (
    <YStack f={1} bc={bgWhite} h="100%" w="100%">
      <YStack h="100%" w="100%">
        <MainScreen />
      </YStack>
    </YStack>
  );
}

export default App;
