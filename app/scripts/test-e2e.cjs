// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { execSync } = require('child_process');

const platform = process.argv[2];
if (!['ios', 'android'].includes(platform)) {
  console.error('Usage: yarn test:e2e <ios|android>');
  process.exit(1);
}

if (platform === 'ios') {
  execSync(
    'xcodebuild -workspace ios/OpenPassport.xcworkspace -scheme OpenPassport -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    { stdio: 'inherit' },
  );
  execSync('maestro test tests/e2e/launch.ios.flow.yaml', { stdio: 'inherit' });
} else {
  execSync(
    'cd android && ./gradlew assembleDebug && cd .. && maestro test tests/e2e/launch.android.flow.yaml',
    { stdio: 'inherit' },
  );
}
