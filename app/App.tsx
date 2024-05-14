import React, { useEffect } from 'react';
import "@ethersproject/shims"
import MainScreen from './src/screens/MainScreen';
import { Buffer } from 'buffer';
import { YStack } from 'tamagui';
import { useToastController } from '@tamagui/toast';
import { downloadZkey } from './src/utils/zkeyDownload';
import useNavigationStore from './src/stores/navigationStore';
import { AMPLITUDE_KEY } from '@env';
import * as amplitude from '@amplitude/analytics-react-native';
global.Buffer = Buffer;

function App(): JSX.Element {
  const toast = useToastController();
  const setToast = useNavigationStore((state) => state.setToast);

  useEffect(() => {
    setToast(toast);
  }, [toast, setToast]);

  useEffect(() => {
    amplitude.init(AMPLITUDE_KEY);

    // downloadZkey("register_sha256WithRSAEncryption_65537"); // might move after nfc scanning
    // downloadZkey("disclose");
    downloadZkey("proof_of_passport");
  }, []);

  // TODO: when passportData already stored, retrieve and jump to main screen

  return (
    <YStack f={1} bc="#161616" h="100%" w="100%">
      <YStack h="100%" w="100%">
        <MainScreen />
      </YStack>
    </YStack>
  );
}

export default App;
