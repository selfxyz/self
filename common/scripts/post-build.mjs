import { writeFileSync } from 'node:fs';
import path from 'node:path';

const __dirname = process.cwd();
const DIST = path.resolve(__dirname, 'dist');
writeFileSync(path.join(DIST, 'esm', 'package.json'), JSON.stringify({ type: 'module' }, null, 4));
writeFileSync(
  path.join(DIST, 'cjs', 'package.json'),
  JSON.stringify({ type: 'commonjs' }, null, 4)
);

// Create missing index files for constants directory
const constantsIndexContent = `export * from './constants.js';
export { commonNames, countries } from './countries.js';
export type { Country3LetterCode as CountriesCountry3LetterCode } from './countries.js';`;

writeFileSync(path.join(DIST, 'esm', 'src', 'constants', 'index.js'), constantsIndexContent);
writeFileSync(path.join(DIST, 'cjs', 'src', 'constants', 'index.js'), constantsIndexContent);

// Create a package.json in the dist root for Metro compatibility
const distPackageJson = {
  name: '@selfxyz/common',
  version: '0.0.7',
  type: 'module',
  exports: {
    '.': './esm/index.js',
    './constants': './esm/src/constants/index.js',
    './utils': './esm/src/utils/index.js',
    './types': './esm/src/types/index.js'
  }
};
writeFileSync(path.join(DIST, 'package.json'), JSON.stringify(distPackageJson, null, 4));
