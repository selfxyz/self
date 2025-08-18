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
    external: ['react', 'react-native'],
    esbuildOptions(options) {
      options.supported = {
        ...options.supported,
        'import-assertions': true,
        'import-attributes': true,
      };
      // Handle React Native's import typeof syntax
      options.loader = {
        ...options.loader,
        '.js': 'jsx',
      };
    },
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
    external: ['react', 'react-native'],
    outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
    esbuildOptions(options) {
      options.supported = {
        ...options.supported,
        'import-assertions': true,
        'import-attributes': true,
      };
      // Handle React Native's import typeof syntax
      options.loader = {
        ...options.loader,
        '.js': 'jsx',
      };
    },
  },
]);
