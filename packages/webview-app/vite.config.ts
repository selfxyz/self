import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tamaguiPlugin } from '@tamagui/vite-plugin';

export default defineConfig({
  resolve: {
    extensions: [
      '.web.tsx',
      '.web.ts',
      '.web.js',
      '.tsx',
      '.ts',
      '.js',
    ],
    alias: {
      // react-native-web for RN primitives used by mobile-sdk-alpha
      'react-native': 'react-native-web',
      // Lottie: swap RN lottie for web lottie
      'lottie-react-native': 'lottie-react',
    },
  },
  plugins: [
    react(),
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
  ],
  define: {
    global: 'globalThis',
  },
  build: {
    target: ['chrome90', 'safari15'],
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
    assetsInlineLimit: 102400,
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
