/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { TamaguiProvider } from 'tamagui';
import { createTamagui } from 'tamagui';
import { config } from '@tamagui/config/v2-native'
import myAppConfig from './tamagui.config';


const tamaguiConfig = createTamagui(config)


const Root = () => (
  <TamaguiProvider config={myAppConfig}>
    <App />
  </TamaguiProvider>
);

AppRegistry.registerComponent(appName, () => Root);
