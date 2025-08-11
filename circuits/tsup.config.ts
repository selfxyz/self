import path from 'path';
import { defineConfig } from 'tsup';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const entry = {
  index: 'src/index.ts',
};

export default defineConfig([
  {
    tsconfig: './tsconfig.json',
    entry,
    format: ['esm'],
    outDir: path.resolve(__dirname, 'dist/esm'),
    dts: false,
    splitting: false,
    clean: true,
    sourcemap: true,
    target: 'es2020',
  },
  {
    tsconfig: './tsconfig.cjs.json',
    entry,
    format: ['cjs'],
    outDir: path.resolve(__dirname, 'dist/cjs'),
    dts: false,
    splitting: false,
    clean: false,
    sourcemap: true,
    target: 'es2020',
  },
]);
