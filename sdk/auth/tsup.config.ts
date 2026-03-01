import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    next: 'src/next.ts',
    passport: 'src/passport.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2020',
  platform: 'node',
  external: ['next-auth', 'passport-oauth2', '@selfxyz/core'],
});
