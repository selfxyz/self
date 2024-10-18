import React, { useEffect } from 'react';
import "react-native-get-random-values"
import "@ethersproject/shims"
import MainScreen from './src/screens/MainScreen';
import { Buffer } from 'buffer';
import { YStack } from 'tamagui';
import { useToastController } from '@tamagui/toast';
import useNavigationStore from './src/stores/navigationStore';
import { AMPLITUDE_KEY } from '@env';
import * as amplitude from '@amplitude/analytics-react-native';
import useUserStore from './src/stores/userStore';
import { bgWhite } from './src/utils/colors';
global.Buffer = Buffer;

function App(): React.JSX.Element {
  const toast = useToastController();
  const setToast = useNavigationStore((state) => state.setToast);
  const initUserStore = useUserStore((state) => state.initUserStore);
  const setSelectedTab = useNavigationStore((state) => state.setSelectedTab);

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
    if (AMPLITUDE_KEY) {
      amplitude.init(AMPLITUDE_KEY);
    }
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
