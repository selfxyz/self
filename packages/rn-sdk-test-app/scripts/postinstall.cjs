// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const iosDir = path.resolve(__dirname, '..', 'ios');
const isCi = process.env.CI === '1' || process.env.CI === 'true';

function runOrExit(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (process.platform !== 'darwin' || isCi || process.env.SKIP_RN_SDK_TEST_APP_PODS === '1') {
  process.exit(0);
}

const rubyVersion = spawnSync('ruby', ['-e', 'puts RUBY_VERSION'], { encoding: 'utf8' });
const version = (rubyVersion.stdout || '').trim();
const [major, minor] = version.split('.').map(Number);

if (!version || major < 3 || (major === 3 && minor < 2)) {
  console.log(`[rn-sdk-test-app] Skipping iOS pod install: Ruby ${version || 'not found'} < 3.2 required. Install Ruby 3.2+ to enable.`);
  process.exit(0);
}

const bundleCheck = spawnSync('bundle', ['check'], {
  cwd: iosDir,
  stdio: 'inherit',
});

if (bundleCheck.status !== 0) {
  runOrExit('bundle', ['install'], iosDir);
}

runOrExit('bash', ['scripts/pod-install-with-cache-fix.sh'], iosDir);
fs.rmSync(path.join(iosDir, '.xcode.env.local'), { force: true });
