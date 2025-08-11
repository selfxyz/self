import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      browser: 'src/browser.ts',
    },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    splitting: false,
    clean: true,
    outDir: 'dist/esm',
    tsconfig: './tsconfig.json',
    target: 'es2020',
  },
  {
    entry: {
      index: 'src/index.ts',
      browser: 'src/browser.ts',
    },
    format: ['cjs'],
    dts: false,
    sourcemap: true,
    splitting: false,
    clean: false,
    outDir: 'dist/cjs',
    tsconfig: './tsconfig.cjs.json',
    target: 'es2020',
    outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
  },
]);
