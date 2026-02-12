import React from 'react';
import ReactDOM from 'react-dom/client';
import { TamaguiProvider, View } from 'tamagui';

import tamaguiConfig from '../tamagui.config';
import { App } from './App';
import { BridgeProvider } from './providers/BridgeProvider';
import { SelfClientProvider } from './providers/SelfClientProvider';

import './fonts.css';
import './reset.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TamaguiProvider config={tamaguiConfig}>
      <View flex={1} height="100vh" width="100%">
        <BridgeProvider>
          <SelfClientProvider>
            <App />
          </SelfClientProvider>
        </BridgeProvider>
      </View>
    </TamaguiProvider>
  </React.StrictMode>,
);
