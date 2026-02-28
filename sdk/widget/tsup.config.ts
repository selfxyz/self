import path from 'path';
import { defineConfig } from 'tsup';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sharedConfig = {
  tsconfig: './tsconfig.json',
  entry: { index: 'index.ts' },
  dts: false,
  splitting: false,
  sourcemap: true,
  target: 'es2020' as const,
  platform: 'browser' as const,
};

export default defineConfig([
  // ESM build for npm (external deps)
  {
    ...sharedConfig,
    format: ['esm'],
    outDir: path.resolve(__dirname, 'dist/esm'),
    outExtension: () => ({ js: '.js' }),
    clean: true,
    external: [/^socket\.io-client/, /^uuid/, /^@selfxyz\/sdk-common/],
  },
  // CJS build for npm (external deps)
  {
    ...sharedConfig,
    format: ['cjs'],
    outDir: path.resolve(__dirname, 'dist/cjs'),
    outExtension: () => ({ js: '.cjs' }),
    clean: false,
    external: [/^socket\.io-client/, /^uuid/, /^@selfxyz\/sdk-common/],
  },
  // IIFE build for CDN (all deps bundled, self-registering)
  {
    ...sharedConfig,
    entry: { 'self-verify': 'index.ts' },
    format: ['iife'],
    outDir: path.resolve(__dirname, 'dist/cdn'),
    outExtension: () => ({ js: '.js' }),
    clean: false,
    globalName: 'SelfVerify',
    noExternal: [/.*/],
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  },
]);
