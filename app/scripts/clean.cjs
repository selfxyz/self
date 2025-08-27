// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { execSync } = require('child_process');

function run(cmd) {
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch {
    // Ignore failures to keep script resilient
  }
}

const tasks = {
  watchman: () => run('watchman watch-del-all'),
  build: () => run('rm -rf ios/build android/app/build android/build'),
  ios: () => run('rm -rf ios/Pods ios/Podfile.lock Gemfile.lock'),
  android: () => run('rm -rf android/app/build android/build'),
  xcode: () => run('rm -rf ~/Library/Developer/Xcode/DerivedData'),
  'pod-cache': () => run('cd ios && pod cache clean --all && cd ..'),
  node: () => run('rm -rf ../node_modules node_modules'),
  'xcode-env-local': () => run('rm -f ios/.xcode.env.local'),
};

const args = process.argv.slice(2);
const targets = args.length
  ? args
  : ['watchman', 'build', 'ios', 'android', 'xcode', 'pod-cache', 'node'];

for (const t of targets) {
  const fn = tasks[t];
  if (fn) {
    fn();
  } else {
    console.warn(`Unknown clean target: ${t}`);
  }
}
