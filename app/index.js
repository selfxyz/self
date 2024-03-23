/**
 * @format
 */

import { AppRegistry, LogBox } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { TamaguiProvider, createTamagui } from 'tamagui';
import { config } from '@tamagui/config/v2-native'

const tamaguiConfig = createTamagui(config)

LogBox.ignoreLogs([
  /bad setState/,
])

const Root = () => (
  <TamaguiProvider config={tamaguiConfig}>
    <App />
  </TamaguiProvider>

);

AppRegistry.registerComponent(appName, () => Root);
