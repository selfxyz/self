import { writeFileSync } from 'node:fs';
import path from 'node:path';

const __dirname = process.cwd();
const DIST = path.resolve(__dirname, 'dist');
writeFileSync(path.join(DIST, 'esm', 'package.json'), JSON.stringify({ type: 'module' }, null, 4));
writeFileSync(
  path.join(DIST, 'cjs', 'package.json'),
  JSON.stringify({ type: 'commonjs' }, null, 4)
);
