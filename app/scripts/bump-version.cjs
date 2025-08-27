// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { execSync } = require('child_process');

const type = process.argv[2];
const allowed = new Set(['major', 'minor', 'patch']);

if (!allowed.has(type)) {
  console.error('Usage: yarn bump-version <major|minor|patch>');
  process.exit(1);
}

execSync(`npm version ${type}`, { stdio: 'inherit' });
execSync('yarn sync-versions', { stdio: 'inherit' });
