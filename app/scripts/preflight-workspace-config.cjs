// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Fails fast if a stray react-native.config.* or metro.config.* exists at the
// workspace root. The RN CLI walks up from CWD and anchors the project root on
// the first one it finds — a file at the workspace root hijacks Metro and makes
// it resolve `./index` against the workspace root instead of app/.
// These files are easy to miss because broad personal gitignore rules (e.g.
// `*.config.*`) can hide them from `git status`.

const fs = require('node:fs');
const path = require('node:path');

const WORKSPACE_ROOT = path.resolve(__dirname, '../..');
const STRAY_PATTERNS = [
  'react-native.config.js',
  'react-native.config.cjs',
  'react-native.config.mjs',
  'metro.config.js',
  'metro.config.cjs',
  'metro.config.mjs',
];

const stray = STRAY_PATTERNS.map(name =>
  path.join(WORKSPACE_ROOT, name),
).filter(p => fs.existsSync(p));

if (stray.length > 0) {
  console.error('\n[31m[preflight] Stray config file(s) at workspace root:[0m');
  for (const p of stray) console.error(`  - ${p}`);
  console.error(
    '\nThese hijack the React Native CLI / Metro project root and break bundling\n' +
      '(e.g. "Metro resolver failed for module \\"./index\\""). They may be hidden\n' +
      'from `git status` by a broad personal gitignore rule like `*.config.*`.\n\n' +
      'Remove them and re-run:\n' +
      `  rm ${stray.join(' ')}\n`,
  );
  process.exit(1);
}
