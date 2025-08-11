import path from 'path';
import { defineConfig } from 'tsup';

export default defineConfig([
  {
    tsconfig: './tsconfig.json',
    entry: {
      index: 'index.ts',
      'components/LED': 'components/LED.tsx',
      'components/SelfQRcode': 'components/SelfQRcode.tsx',
      'utils/utils': 'utils/utils.ts',
      'utils/styles': 'utils/styles.ts',
      'utils/websocket': 'utils/websocket.ts',
    },
    format: ['esm'],
    outDir: path.resolve(__dirname, 'dist/esm'),
    dts: false,
    splitting: false,
    clean: true,
    sourcemap: true,
    target: 'es2020',
    external: [
      /^react/,
      /^react-dom/,
      /^lottie-react/,
      /^qrcode.react/,
      /^socket.io-client/,
      /^node-forge/,
    ],
  },
  {
    tsconfig: './tsconfig.cjs.json',
    entry: {
      index: 'index.ts',
      'components/LED': 'components/LED.tsx',
      'components/SelfQRcode': 'components/SelfQRcode.tsx',
      'utils/utils': 'utils/utils.ts',
      'utils/styles': 'utils/styles.ts',
      'utils/websocket': 'utils/websocket.ts',
    },
    format: ['cjs'],
    outDir: path.resolve(__dirname, 'dist/cjs'),
    dts: false,
    splitting: false,
    clean: false,
    sourcemap: true,
    target: 'es2020',
    external: [
      /^react/,
      /^react-dom/,
      /^lottie-react/,
      /^qrcode.react/,
      /^socket.io-client/,
      /^node-forge/,
    ],
  },
]);
