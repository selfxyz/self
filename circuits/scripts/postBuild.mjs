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

// Initialize dist package.json (filled after shims)
const distPackageJson = {
  name: '@selfxyz/circuits',
  version: packageJson.version,
  type: 'module',
  exports: { '.': './esm/index.js' },
};

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function createShim(shimPath, targetPath) {
  const shimDir = path.join(DIST, shimPath);
  mkdirSync(shimDir, { recursive: true });
  const esmTarget = targetPath; // e.g. ./esm/utils/rsa.js (posix-like expected)
  const cjsTarget = esmTarget.replace('/esm/', '/cjs/').replace(/\.js$/, '.cjs');

  // ESM shim entry
  writeFileSync(
    path.join(shimDir, 'index.js'),
    `// Shim for @selfxyz/circuits/${shimPath}\nexport * from '${esmTarget.replace(/\.js$/, '')}';\nexport { default } from '${esmTarget.replace(/\.js$/, '')}';\n`
  );
  // CJS shim entry
  writeFileSync(
    path.join(shimDir, 'index.cjs'),
    `// Shim for @selfxyz/circuits/${shimPath}\nmodule.exports = require('${cjsTarget}');\n`
  );
  // Types shim
  writeFileSync(
    path.join(shimDir, 'index.d.ts'),
    `// Types for @selfxyz/circuits/${shimPath}\nexport * from '${esmTarget.replace(/\.js$/, '')}';\nexport { default } from '${esmTarget.replace(/\.js$/, '')}';\n`
  );

  // Add subpath export for this shim
  const subpath = `./${toPosix(shimPath)}`;
  distPackageJson.exports[subpath] = {
    import: `./${toPosix(path.relative(DIST, path.join(shimDir, 'index.js')))}`,
    require: `./${toPosix(path.relative(DIST, path.join(shimDir, 'index.cjs')))}`,
  };
}

// Materialize shims and export map
shimConfigs.forEach((config) => createShim(config.shimPath, config.targetPath));

// Finally write dist/package.json (after exports are populated)
writeFileSync(path.join(DIST, 'package.json'), JSON.stringify(distPackageJson, null, 4));
