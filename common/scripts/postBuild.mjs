import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { shimConfigs } from './shimConfigs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '..', 'dist');

// Read the version from the main package.json
const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

writeFileSync(path.join(DIST, 'esm', 'package.json'), JSON.stringify({ type: 'module' }, null, 4));
writeFileSync(
  path.join(DIST, 'cjs', 'package.json'),
  JSON.stringify({ type: 'commonjs' }, null, 4)
);

// Create a package.json in the dist root for Metro compatibility
const distPackageJson = {
  name: '@selfxyz/common',
  version: packageJson.version,
  type: 'module',
  exports: {
    '.': './esm/index.js',
    './constants': './esm/src/constants/index.js',
    './utils': './esm/src/utils/index.js',
    './utils/passports/validate': './esm/src/utils/passports/validate.js',
    './types': './esm/src/types/index.js',
  },
};
writeFileSync(path.join(DIST, 'package.json'), JSON.stringify(distPackageJson, null, 4));

// Create shim files for Metro compatibility
// Metro sometimes doesn't properly resolve package.json exports, so we create direct file shims

// Helper function to create shim files
function createShim(shimPath, targetPath, name) {
  const shimDir = path.join(DIST, shimPath);
  mkdirSync(shimDir, { recursive: true });

  // Convert ESM path to CommonJS path for proper require() compatibility
  const cjsTargetPath = targetPath.replace('/esm/', '/cjs/').replace('.js', '.cjs');

  writeFileSync(
    path.join(shimDir, 'index.js'),
    `// Shim file to help Metro resolve @selfxyz/common/${name}
module.exports = require('${cjsTargetPath}');`
  );
  writeFileSync(
    path.join(shimDir, 'index.d.ts'),
    `// Shim file to help Metro resolve @selfxyz/common/${name} types
export * from '${targetPath.replace('.js', '')}';`
  );
}

// Create all shims from configuration
shimConfigs.forEach((config) => {
  createShim(config.shimPath, config.targetPath, config.name);
});
