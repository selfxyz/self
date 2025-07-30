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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': [
            'react',
            'react-dom',
            '@react-navigation/native',
            '@react-navigation/native-stack',
          ],
          'vendor-ui': ['tamagui', '@tamagui/lucide-icons', '@tamagui/toast'],
          'vendor-crypto': [
            'elliptic',
            'node-forge',
            'ethers',
            '@peculiar/x509',
            'pkijs',
            'asn1js',
            '@stablelib/cbor',
          ],
          'vendor-device': [
            'react-native-nfc-manager',
            'react-native-gesture-handler',
            'react-native-haptic-feedback',
          ],
          'vendor-analytics': [
            '@segment/analytics-react-native',
            '@sentry/react',
            '@sentry/react-native',
          ],
          'vendor-animations': ['lottie-react-native', 'lottie-react'],
          'vendor-cloud': [
            '@robinbobin/react-native-google-drive-api-wrapper',
            'react-native-cloud-storage',
          ],
          'screens-passport': [
            './src/screens/passport',
            './src/utils/nfcScanner',
          ],
          'screens-prove': ['./src/screens/prove', './src/utils/proving'],
          'screens-settings': ['./src/screens/settings'],
          'screens-recovery': ['./src/screens/recovery'],
          'screens-dev': ['./src/screens/dev'],
          'screens-aesop': ['./src/screens/aesop'],
        },
      },
    },
  },
});
