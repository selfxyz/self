/**
 * @format
 */

import { AppRegistry, LogBox } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { TamaguiProvider } from 'tamagui';
import myAppConfig from './tamagui.config';

LogBox.ignoreLogs([
  /bad setState/,
]) 

const Root = () => (
  <TamaguiProvider config={myAppConfig}>
    <App />
  </TamaguiProvider>
);

AppRegistry.registerComponent(appName, () => Root);
