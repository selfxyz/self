import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['index.ts', 'src/**/*'],
    format: ['esm'],
    dts: false,
    splitting: true,
    sourcemap: true,
    clean: true,
    outDir: 'dist/esm',
    target: 'es2020',
    tsconfig: './tsconfig.json',
    skipNodeModulesBundle: true,
  },
  {
    entry: ['index.ts', 'src/**/*'],
    format: ['cjs'],
    dts: false,
    splitting: true,
    sourcemap: true,
    clean: false,
    outDir: 'dist/cjs',
    target: 'es2020',
    tsconfig: './tsconfig.cjs.json',
    skipNodeModulesBundle: true,
  },
]);
