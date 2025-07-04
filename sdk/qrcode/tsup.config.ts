import type { Options } from 'tsup';

const env = process.env.NODE_ENV;

export const tsup: Options = {
  splitting: true,
  clean: true, // clean up the dist folder
  dts: true, // generate dts files
  format: ['cjs', 'esm'], // generate cjs and esm files
  skipNodeModulesBundle: true,
  entryPoints: ['index.ts', 'animations/**/*', 'components/**/*', 'utils/**/*'],
  watch: env === 'development',
  target: 'es2020',
  outDir: 'dist',
};
