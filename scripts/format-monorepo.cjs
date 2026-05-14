#!/usr/bin/env node
/* eslint-disable no-console */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function runPnpm(args, env = {}) {
  const result = spawnSync('pnpm', args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

runPnpm(['format:root'], { SKIP_BUILD_DEPS: '1' });
runPnpm(['format:github']);
runPnpm(['--filter', '@selfxyz/kmp-sdk', 'format'], { GRADLE_USER_HOME: path.join(root, '.gradle-home') });
runPnpm(['--filter', '@selfxyz/kmp-sdk-test-app', 'format'], {
  GRADLE_USER_HOME: path.join(root, '.gradle-home'),
});
runPnpm(['native-shell:format']);
runPnpm(
  ['-r', '--if-present', '--filter', '!self-workspace-root', '--filter', '!@selfxyz/kmp-sdk', '--filter', '!@selfxyz/kmp-sdk-test-app', 'run', 'format'],
  { SKIP_BUILD_DEPS: '1' },
);
