// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { tamaguiPlugin } from '@tamagui/vite-plugin';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: 'web',
  publicDir: 'web',
  envDir: '..', // This is the directory where Vite will look for .env files relative to the root
  resolve: {
    extensions: [
      '.web.tsx',
      '.web.js',
      '.web.jsx',
      '.web.ts',
      '.tsx',
      '.ts',
      '.jsx',
      '.js',
    ],
    alias: {
      '@env': path.resolve(__dirname, 'env.ts'),
      '/src': path.resolve(__dirname, 'src'),
      'react-native-svg': 'react-native-svg-web',
      'lottie-react-native': 'lottie-react',
      'react-native-safe-area-context': path.resolve(
        __dirname,
        'src/mocks/react-native-safe-area-context.js',
      ),
      'react-native-gesture-handler': path.resolve(
        __dirname,
        'src/mocks/react-native-gesture-handler.ts',
      ),
    },
  },
  plugins: [
    react(),
    svgr({
      include: '**/*.svg',
    }),
    tamaguiPlugin({
      config: path.resolve(__dirname, 'tamagui.config.ts'),
      components: ['tamagui'],
      enableDynamicEvaluation: true,
      excludeReactNativeWebExports: [
        'Switch',
        'ProgressBar',
        'Picker',
        'CheckBox',
        'Touchable',
      ],
      platform: 'web',
      optimize: true,
    }),
  ].filter(Boolean),
  define: {
    global: 'globalThis',
  },
});
