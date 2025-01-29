import React, { useEffect } from 'react';

import * as amplitude from '@amplitude/analytics-react-native';
import { AMPLITUDE_KEY } from '@env';
import '@ethersproject/shims';
import { Buffer } from 'buffer';
import 'react-native-get-random-values';

import { YStack } from 'tamagui';
import { bgWhite } from './src/utils/colors';
import { setupUniversalLinkListener } from './src/utils/qrCode'; // Adjust the import path as needed
import AppNavigation from './src/Navigation';
import useUserStore from './src/stores/userStore';

global.Buffer = Buffer;

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
    if (AMPLITUDE_KEY) {
      amplitude.init(AMPLITUDE_KEY);
    }
  }, []);

  useEffect(() => {
    const cleanup = setupUniversalLinkListener();
    return cleanup;
  }, []);

  return (
    <YStack f={1} bc={bgWhite} h="100%" w="100%">
      <AppNavigation />
    </YStack>
  );
}

export default App;
