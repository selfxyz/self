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
      '@/package.json': resolve(__dirname, 'package.json'),
      'react-native-svg': 'react-native-svg-web',
      'lottie-react-native': 'lottie-react',
      '@react-native-community/blur': resolve(
        __dirname,
        'src/devtools/mocks/react-native-community-blur.ts',
      ),
      'react-native-safe-area-context': resolve(
        __dirname,
        'src/devtools/mocks/react-native-safe-area-context.js',
      ),
      'react-native-gesture-handler': resolve(
        __dirname,
        'src/devtools/mocks/react-native-gesture-handler.ts',
      ),
      'react-native-passport-reader': resolve(
        __dirname,
        'src/devtools/mocks/react-native-passport-reader.ts',
      ),
      '@/integrations/nfc/nfcScanner': resolve(
        __dirname,
        'src/devtools/mocks/nfcScanner.ts',
      ),
      crypto: resolve(__dirname, '../common/src/polyfills/crypto.ts'),
      buffer: 'buffer',

      // Fix @noble/hashes subpath exports for web builds
      '@noble/hashes/crypto.js': '@noble/hashes/crypto',
    },
  },
  plugins: [
    {
      name: 'fix-buffer-externalization',
      transform(code, id) {
        // Fix the mobile-sdk-alpha chunk that references Buffer
        if (id.includes('mobile-sdk-alpha') && code.includes('from "buffer"')) {
          // Keep the import so the polyfill is bundled, and set global assignment
          const fixedCode = code.replace(
            /import\s+\{\s*Buffer\s*\}\s+from\s+['"]buffer['"]/g,
            "import { Buffer } from 'buffer';\nif (typeof globalThis.Buffer === 'undefined') { globalThis.Buffer = Buffer; }",
          );
          return { code: fixedCode, map: null };
        }
        return null;
      },
    },
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
    include: ['buffer'],
    exclude: ['fs', 'path', 'child_process', '@zk-email/helpers'],
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
      external: ['fs', 'child_process', '@zk-email/helpers'],
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
          'screens-document-core': ['./src/navigation/documents.ts'],
          'screens-passport-nfc': ['./src/devtools/mocks/nfcScanner.ts'],

          // Proving - split into even smaller chunks
          'screens-prove-core': ['./src/navigation/verification.ts'],
          'screens-prove-validation-core': [
            './src/proving/validateDocument.ts',
          ],
          'screens-prove-utils': [
            './src/proving/index.ts',
            './src/proving/loadingScreenStateText.ts',
          ],

          // Large animations - split out heavy Lottie files
          'animations-passport-onboarding': [
            './src/assets/animations/passport_onboarding.json',
          ],

          // Other screens
          'screens-settings': ['./src/navigation/account.ts'],
          'screens-dev': ['./src/navigation/devTools.ts'],
        },
      },
    },
  },
});
