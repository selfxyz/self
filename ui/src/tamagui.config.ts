import { config } from '@tamagui/config/v3';
import { createShorthands, createTamagui } from 'tamagui';

// or '@tamagui/core'

const appConfig = createTamagui({
  ...config,
  shorthands: createShorthands({
    ...config.shorthands,
    f: 'flex',
    h: 'height',
    w: 'width',
    ai: 'alignItems',
    jc: 'justifyContent',
    p: 'padding',
    px: 'paddingHorizontal',
    py: 'paddingVertical',
    pt: 'paddingTop',
    pb: 'paddingBottom',
    m: 'margin',
    mx: 'marginHorizontal',
    my: 'marginVertical',
    mt: 'marginTop',
    mb: 'marginBottom',
    mr: 'marginRight',
    ml: 'marginLeft',
    bg: 'backgroundColor',
    bc: 'borderColor',
  } as const),
});

export type AppConfig = typeof appConfig;

declare module 'tamagui' {
  // or '@tamagui/core'
  // overrides TamaguiCustomConfig so your custom types
  // work everywhere you import `tamagui`
  interface TamaguiCustomConfig extends AppConfig {}
}

export default appConfig;
