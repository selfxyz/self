import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shimConfigs } from './shimConfigs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '..', 'dist');

const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

writeFileSync(
  path.join(DIST, 'esm', 'package.json'),
  JSON.stringify({ type: 'module' }, null, 4),
);
writeFileSync(
  path.join(DIST, 'cjs', 'package.json'),
  JSON.stringify({ type: 'commonjs' }, null, 4),
);

const distPackageJson = {
  name: '@selfxyz/qrcode',
  version: packageJson.version,
  type: 'module',
  exports: {
    '.': './esm/index.js',
    './components/LED': './esm/components/LED.js',
    './components/SelfQRcode': './esm/components/SelfQRcode.js',
    './utils/utils': './esm/utils/utils.js',
    './utils/styles': './esm/utils/styles.js',
    './utils/websocket': './esm/utils/websocket.js',
  },
};
writeFileSync(
  path.join(DIST, 'package.json'),
  JSON.stringify(distPackageJson, null, 4),
);

function createShim(shimPath, targetPath) {
  const shimDir = path.join(DIST, shimPath);
  mkdirSync(shimDir, { recursive: true });
  const cjsTargetPath = targetPath
    .replace('/esm/', '/cjs/')
    .replace('.js', '.cjs');
  writeFileSync(
    path.join(shimDir, 'index.js'),
    `module.exports = require('${cjsTargetPath}');`,
  );
  writeFileSync(
    path.join(shimDir, 'index.d.ts'),
    `export * from '${targetPath.replace('.js', '')}';`,
  );
}

shimConfigs.forEach(c => createShim(c.shimPath, c.targetPath));
