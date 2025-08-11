import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { shimConfigs } from './shimConfigs.mjs';

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
  name: '@selfxyz/core',
  version: packageJson.version,
  type: 'module',
  exports: {
    '.': './esm/index.js',
    './SelfBackendVerifier': './esm/src/SelfBackendVerifier.js',
    './errors': './esm/src/errors.js',
    './store/DefaultConfigStore': './esm/src/store/DefaultConfigStore.js',
    './store/InMemoryConfigStore': './esm/src/store/InMemoryConfigStore.js',
    './store/interface': './esm/src/store/interface.js',
    './types': './esm/src/types/types.js',
    './utils': './esm/src/utils/utils.js',
    './utils/constants': './esm/src/utils/constants.js',
    './utils/hash': './esm/src/utils/hash.js',
    './utils/id': './esm/src/utils/id.js',
    './utils/proof': './esm/src/utils/proof.js',
    './typechain-types': './esm/src/typechain-types/index.js',
  },
};
writeFileSync(path.join(DIST, 'package.json'), JSON.stringify(distPackageJson, null, 4));

// Helper function to create shim files
function createShim(shimPath, targetPath, name) {
  const shimDir = path.join(DIST, shimPath);
  mkdirSync(shimDir, { recursive: true });

  // Tsup emits .js files by default, so just swap the directory
  const cjsTargetPath = targetPath.replace('/esm/', '/cjs/');

  writeFileSync(
    path.join(shimDir, 'index.js'),
    `// Shim file to help Metro resolve @selfxyz/core/${name}\nmodule.exports = require('${cjsTargetPath}');`
  );
  writeFileSync(
    path.join(shimDir, 'index.d.ts'),
    `// Shim file to help Metro resolve @selfxyz/core/${name} types\nexport * from '${targetPath.replace('.js', '')}';`
  );
}

// Create all shims from configuration
shimConfigs.forEach((config) => {
  createShim(config.shimPath, config.targetPath, config.name);
});
