import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shimConfigs } from './shimConfigs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '..', 'dist');

// Read version from package.json
const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

// Write package.json files for module type resolution
writeFileSync(path.join(DIST, 'esm', 'package.json'), JSON.stringify({ type: 'module' }, null, 4));
writeFileSync(path.join(DIST, 'cjs', 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 4));

// Create a package.json in dist root for Metro
const distPackageJson = {
  name: '@selfxyz/mobile-sdk-alpha',
  version: packageJson.version,
  type: 'module',
  exports: {
    '.': './esm/index.js',
    './browser': './esm/browser.js',
  },
};
writeFileSync(path.join(DIST, 'package.json'), JSON.stringify(distPackageJson, null, 4));

// Helper to create shims for Metro
function createShim(shimPath, targetPath, name) {
  const shimDir = path.join(DIST, shimPath);
  mkdirSync(shimDir, { recursive: true });

  const cjsTargetPath = targetPath.replace('/esm/', '/cjs/').replace('.js', '.cjs');
  const dtsTarget = targetPath.replace('.js', '');

  writeFileSync(
    path.join(shimDir, 'index.js'),
    `// Shim file to help Metro resolve @selfxyz/mobile-sdk-alpha/${name}\nmodule.exports = require('${cjsTargetPath}');`,
  );
  writeFileSync(
    path.join(shimDir, 'index.d.ts'),
    `// Shim file to help Metro resolve @selfxyz/mobile-sdk-alpha/${name} types\nexport * from "${dtsTarget}";`,
  );
}

// Create all shims from configuration
shimConfigs.forEach(({ shimPath, targetPath, name }) => {
  createShim(shimPath, targetPath, name);
});
