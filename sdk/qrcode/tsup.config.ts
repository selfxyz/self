import path from 'path';
import { defineConfig } from 'tsup';
import { fileURLToPath } from 'url';

// Shared entry map to keep ESM/CJS builds in sync
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const entries = {
  index: 'index.ts',
  'components/LED': 'components/LED.tsx',
  'components/SelfQRcode': 'components/SelfQRcode.tsx',
  'utils/utils': 'utils/utils.ts',
  'utils/styles': 'utils/styles.ts',
  'utils/websocket': 'utils/websocket.ts',
};

export default defineConfig([
  {
    tsconfig: './tsconfig.json',
    entry: entries,
    format: ['esm'],
    outDir: path.resolve(__dirname, 'dist/esm'),
    outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
    dts: false,
    splitting: false,
    clean: true,
    sourcemap: true,
    target: 'es2020',
    platform: 'neutral',
    external: [
      /^react/,
      /^react-dom/,
      /^react\/jsx-runtime$/,
      /^lottie-react/,
      /^qrcode.react/,
      /^socket.io-client/,
      /^node-forge/,
    ],
  },
  {
    tsconfig: './tsconfig.cjs.json',
    entry: entries,
    format: ['cjs'],
    outDir: path.resolve(__dirname, 'dist/cjs'),
    outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
    dts: false,
    splitting: false,
    clean: false,
    sourcemap: true,
    target: 'es2020',
    platform: 'neutral',
    external: [
      /^react/,
      /^react-dom/,
      /^react\/jsx-runtime$/,
      /^lottie-react/,
      /^qrcode.react/,
      /^socket.io-client/,
      /^node-forge/,
    ],
  },
]);
