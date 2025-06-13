import { TamaguiConfig } from '@selfxyz/ui';
import { createTamagui } from 'tamagui';

const appConfig = createTamagui(TamaguiConfig);

export type AppConfig = typeof appConfig;

declare module 'tamagui' {
  // or '@tamagui/core'
  // overrides TamaguiCustomConfig so your custom types
  // work everywhere you import `tamagui`
  interface TamaguiCustomConfig extends AppConfig {}
}

export default appConfig;
