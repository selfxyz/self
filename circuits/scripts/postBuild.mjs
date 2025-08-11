import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shimConfigs } from './shimConfigs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '..', 'dist');

// Read package version
const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

writeFileSync(path.join(DIST, 'esm', 'package.json'), JSON.stringify({ type: 'module' }, null, 4));
writeFileSync(
  path.join(DIST, 'cjs', 'package.json'),
  JSON.stringify({ type: 'commonjs' }, null, 4)
);

// Create dist package.json for Metro
const distPackageJson = {
  name: '@selfxyz/circuits',
  version: packageJson.version,
  type: 'module',
  exports: {
    '.': './esm/index.js',
  },
};
writeFileSync(path.join(DIST, 'package.json'), JSON.stringify(distPackageJson, null, 4));

function createShim(shimPath, targetPath) {
  const shimDir = path.join(DIST, shimPath);
  mkdirSync(shimDir, { recursive: true });
  const cjsTargetPath = targetPath.replace('/esm/', '/cjs/').replace('.js', '.cjs');
  writeFileSync(
    path.join(shimDir, 'index.js'),
    `// Shim file for @selfxyz/circuits/${shimPath}\nmodule.exports = require('${cjsTargetPath}');`
  );
  writeFileSync(
    path.join(shimDir, 'index.d.ts'),
    `// Shim file for @selfxyz/circuits/${shimPath} types\nexport * from '${targetPath.replace('.js', '')}';`
  );
}

shimConfigs.forEach((config) => createShim(config.shimPath, config.targetPath));
