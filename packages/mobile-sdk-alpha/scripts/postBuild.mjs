// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { shimConfigs } from './shimConfigs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '..', 'dist');

// Read version from package.json
const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

// Write package.json files for module type resolution
try {
  // Ensure directories exist before writing files
  mkdirSync(path.join(DIST, 'esm'), { recursive: true });
  mkdirSync(path.join(DIST, 'cjs'), { recursive: true });

  writeFileSync(path.join(DIST, 'esm', 'package.json'), JSON.stringify({ type: 'module' }, null, 4));
  writeFileSync(path.join(DIST, 'cjs', 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 4));
} catch (error) {
  console.error('Failed to write module type package.json files:', error.message);
  console.error('Target paths:', {
    esm: path.join(DIST, 'esm', 'package.json'),
    cjs: path.join(DIST, 'cjs', 'package.json'),
  });
  process.exit(1);
}

// Create a package.json in dist root for Metro
const distPackageJson = {
  name: '@selfxyz/mobile-sdk-alpha',
  version: packageJson.version,
  type: 'module',
  exports: {
    '.': './esm/index.js',
    './browser': './esm/browser.js',
    './constants/analytics': './esm/constants/analytics.js',
    './stores': './esm/stores.js',
  },
};
try {
  writeFileSync(path.join(DIST, 'package.json'), JSON.stringify(distPackageJson, null, 4));
} catch (error) {
  console.error('Failed to write dist package.json:', error.message);
  console.error('Target path:', path.join(DIST, 'package.json'));
  process.exit(1);
}

// Helper to create shims for Metro
function createShim(shimPath, targetPath, name) {
  try {
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
  } catch (error) {
    console.error(`Failed to create shim for ${name}:`, error.message);
    console.error('Shim path:', path.join(DIST, shimPath));
    process.exit(1);
  }
}

// Create all shims from configuration
shimConfigs.forEach(({ shimPath, targetPath, name }) => {
  createShim(shimPath, targetPath, name);
});
