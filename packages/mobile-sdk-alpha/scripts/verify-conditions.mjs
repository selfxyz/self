// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { URL } from 'node:url';

import { readFile } from 'node:fs/promises';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const errors = [];

if (pkg.type !== 'module') errors.push('package.json must set type: module');
if (!pkg.exports || !pkg.exports['.']) errors.push("package.json must define conditional exports for '.'");
if (pkg.sideEffects !== false) errors.push('package.json must set sideEffects: false for tree-shaking');
if (!pkg.scripts?.build?.includes('tsup')) errors.push('build script should use tsup');

// Check for environment-specific exports
const dotExports = pkg.exports?.['.'];
if (dotExports && typeof dotExports === 'object') {
  if (!dotExports.browser) errors.push("exports['.'] must include 'browser' condition for web environments");
  if (!dotExports['react-native'])
    errors.push("exports['.'] must include 'react-native' condition for React Native environments");
}

// Check for types exports
if (!dotExports?.types && !pkg.types) {
  errors.push("Either exports['.'].types or pkg.types must be defined for TypeScript support");
}

if (errors.length) {
  console.error('Export conditions validation failed:');
  for (const e of errors) console.error(' - ' + e);
  process.exit(1);
} else {
  console.log('OK: export conditions & packaging validated.');
}
