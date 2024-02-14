import { config } from '@tamagui/config/v2-native'
import { createTamagui, createFont } from 'tamagui'


export type AppConfig = typeof appConfig

declare module 'tamagui' {
  // or '@tamagui/core'
  // overrides TamaguiCustomConfig so your custom types
  // work everywhere you import `tamagui`
  interface TamaguiCustomConfig extends AppConfig { }
}

// Define Luciole fonts
const Luciole = createFont({
  family: 'Luciole, sans-serif',
  size: {
    1: 12,
    2: 14,
    3: 16,
    // Define more sizes as needed
  },
  lineHeight: {
    1: 18,
    2: 20,
    3: 22,
    // Define more line heights as needed
  },
  weight: {
    normal: '400', // Assuming 'normal' maps to Luciole-Regular
    bold: '700', // Assuming 'bold' maps to Luciole-Bold
  },
  letterSpacing: {
    normal: 0,
    // Add more if needed
  },
  face: {
    400: { normal: 'Luciole-Regular', italic: 'Luciole-Italic' },
    700: { normal: 'Luciole-Bold', italic: 'Luciole-BoldItalic' },
    // Adjust according to your font files
  },
})


const extendedConfig = createTamagui({
  ...config,
  fonts: {
    ...config.fonts,
    // Replace or add the 'Luciole' font as needed. Assuming 'body' is a key you want to replace/add.
    body: Luciole,
    heading: Luciole,
    // If you have other font roles (e.g., 'heading'), you might want to add or replace them here as well.
  },
  // Include any other customizations to the config here
});

const myAppConfig = createTamagui(extendedConfig)


export default myAppConfig