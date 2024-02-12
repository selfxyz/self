/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { TamaguiProvider } from 'tamagui';
import { createTamagui } from 'tamagui';
import { config } from '@tamagui/config/v3'

const tamaguiConfig = createTamagui(config)


const Root = () => (
  <TamaguiProvider config={tamaguiConfig}>
    <App />
  </TamaguiProvider>
);

AppRegistry.registerComponent(appName, () => Root);
