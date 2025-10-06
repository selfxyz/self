// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { execSync } = require('child_process');

try {
  // Get list of available simulators
  const output = execSync('xcrun simctl list devices available --json', {
    encoding: 'utf8',
  });

  const devices = JSON.parse(output).devices;

  // Find first available iPhone simulator (prefer latest iOS version)
  let firstSimulator = null;

  // Get iOS runtime keys sorted in reverse (latest first)
  const runtimeKeys = Object.keys(devices)
    .filter(key => key.includes('iOS'))
    .sort()
    .reverse();

  for (const runtime of runtimeKeys) {
    const iPhones = devices[runtime].filter(
      device => device.name.startsWith('iPhone') && device.isAvailable,
    );

    if (iPhones.length > 0) {
      firstSimulator = iPhones[0].name;
      break;
    }
  }

  if (!firstSimulator) {
    console.error('No available iPhone simulators found');
    process.exit(1);
  }

  console.log(`Using simulator: ${firstSimulator}`);

  // Run the iOS build with the selected simulator
  execSync(
    `react-native run-ios --scheme OpenPassport --simulator="${firstSimulator}"`,
    {
      stdio: 'inherit',
    },
  );
} catch (error) {
  console.error('Failed to run iOS simulator:', error.message);
  process.exit(1);
}
