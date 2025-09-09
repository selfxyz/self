// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { dirname, resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import { tamaguiPlugin } from '@tamagui/vite-plugin';
import react from '@vitejs/plugin-react-swc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
      '@env': resolve(__dirname, 'env.ts'),
      '/src': resolve(__dirname, 'src'),
      '@': resolve(__dirname, 'src'),
      'react-native-svg': 'react-native-svg-web',
      'lottie-react-native': 'lottie-react',
      '@react-native-community/blur': resolve(
        __dirname,
        'src/mocks/react-native-community-blur.ts',
      ),
      'react-native-safe-area-context': resolve(
        __dirname,
        'src/mocks/react-native-safe-area-context.js',
      ),
      'react-native-gesture-handler': resolve(
        __dirname,
        'src/mocks/react-native-gesture-handler.ts',
      ),
      'react-native-passport-reader': resolve(
        __dirname,
        'src/mocks/react-native-passport-reader.ts',
      ),
    },
  },
  plugins: [
    react(),
    svgr({
      include: '**/*.svg',
    }),
    tamaguiPlugin({
      config: resolve(__dirname, 'tamagui.config.ts'),
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
    // Bundle analyzer for tree shaking analysis
    visualizer({
      filename: 'web/dist/bundle-analysis.html',
      open: false, // Don't auto-open in CI
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // Shows tree shaking effectiveness visually
    }),
  ].filter(Boolean),
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['fs', 'path', 'child_process'],
    esbuildOptions: {
      // Optimize minification
      minifyIdentifiers: true,
      minifySyntax: true,
      minifyWhitespace: true,
    },
  },

  build: {
    emptyOutDir: true,
    outDir: resolve(__dirname, 'web/dist'),
    // Optimize minification settings
    minify: 'esbuild',
    target: 'es2020',
    cssMinify: true,
    cssCodeSplit: true,
    rollupOptions: {
      external: ['fs', 'path', 'child_process'],
      output: {
        // Optimize chunk size and minification
        compact: true,
        manualChunks: {
          // Core React and Navigation
          'vendor-react-core': ['react', 'react-dom'],
          'vendor-navigation': [
            '@react-navigation/native',
            '@react-navigation/native-stack',
          ],

          // UI Framework - split Tamagui into smaller chunks
          'vendor-ui-core': ['tamagui'],
          'vendor-ui-icons': ['@tamagui/lucide-icons'],
          'vendor-ui-toast': ['@tamagui/toast'],

          // Crypto libraries - split heavy crypto into smaller chunks
          'vendor-crypto-core': ['elliptic', 'node-forge'],
          'vendor-crypto-ethers': ['ethers'],
          'vendor-crypto-x509': ['@peculiar/x509', 'pkijs', 'asn1js'],
          'vendor-crypto-cbor': ['@stablelib/cbor'],

          // Heavy crypto dependencies - split further
          'vendor-crypto-poseidon': ['poseidon-lite'],
          'vendor-crypto-lean-imt': ['@openpassport/zk-kit-lean-imt'],

          // Device-specific libraries
          'vendor-device-nfc': ['react-native-nfc-manager'],
          'vendor-device-gesture': ['react-native-gesture-handler'],
          'vendor-device-haptic': ['react-native-haptic-feedback'],

          // Analytics - split by provider
          'vendor-analytics-segment': ['@segment/analytics-react-native'],
          'vendor-analytics-sentry': ['@sentry/react', '@sentry/react-native'],

          // Animations
          'vendor-animations-lottie': ['lottie-react-native', 'lottie-react'],

          // WebSocket and Socket.IO
          'vendor-websocket': ['socket.io-client'],

          // UUID generation
          'vendor-uuid': ['uuid'],

          // State management
          'vendor-state-xstate': ['xstate'],
          'vendor-state-zustand': ['zustand'],

          // Screen-specific chunks - more granular
          'screens-document-core': ['./src/navigation/document.ts'],
          'screens-passport-nfc': ['./src/utils/nfcScanner.ts'],

          // Proving - split into even smaller chunks
          'screens-prove-core': ['./src/navigation/prove.ts'],
          'screens-prove-machine-core': [
            './src/utils/proving/provingMachine.ts',
          ],
          'screens-prove-validation-core': [
            './src/utils/proving/validateDocument.ts',
          ],
          'screens-prove-utils': [
            './src/utils/proving/index.ts',
            './src/utils/proving/provingInputs.ts',
            './src/utils/proving/loadingScreenStateText.ts',
          ],

          // Large animations - split out heavy Lottie files
          'animations-passport-onboarding': [
            './src/assets/animations/passport_onboarding.json',
          ],

          // Other screens
          'screens-settings': ['./src/navigation/settings.ts'],
          'screens-recovery': ['./src/navigation/recovery.ts'],
          'screens-dev': ['./src/navigation/devTools.ts'],
          'screens-aesop': ['./src/navigation/aesop.ts'],
        },
      },
    },
  },
});
