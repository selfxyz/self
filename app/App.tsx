import 'react-native-get-random-values';
import '@ethersproject/shims';
import { Buffer } from 'buffer';
import { NativeModules } from 'react-native';

global.Buffer = Buffer;

import React, { useEffect } from 'react';
import * as amplitude from '@amplitude/analytics-react-native';
import { AMPLITUDE_KEY, SEGMENT_KEY } from '@env';
import { useToastController } from '@tamagui/toast';
import { YStack } from 'tamagui';
import { createClient } from '@segment/analytics-react-native';

import MainScreen from './src/screens/MainScreen';
import useNavigationStore from './src/stores/navigationStore';
import useUserStore from './src/stores/userStore';
import { bgWhite } from './src/utils/colors';
import { setupUniversalLinkListener } from './src/utils/qrCode'; // Adjust the import path as needed

// Create the client at the module level
const segmentClient = SEGMENT_KEY
  ? createClient({
    writeKey: SEGMENT_KEY,
    trackAppLifecycleEvents: true,
    trackDeepLinks: true,
    debug: true,
  })
  : null;

// Export it for use in other components
export { segmentClient };

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

  return (
    <YStack f={1} bc={bgWhite} h="100%" w="100%">
      <YStack h="100%" w="100%">
        <MainScreen />
      </YStack>
    </YStack>
  );
}

export default App;
