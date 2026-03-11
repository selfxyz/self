// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { execFileSync } = require('child_process');
const path = require('path');

const APP_ROOT = path.resolve(__dirname, '..');

const DEVICE_PRIORITY = [
  'iPhone 16 Pro',
  'iPhone 16',
  'iPhone 15 Pro',
  'iPhone 15',
];

function normalizeRuntimeVersion(runtime) {
  return runtime.replace(/\./g, '-');
}

function extractRuntimeVersion(runtime) {
  const match = runtime.match(/iOS-(\d+(?:-\d+)*)/i);

  if (!match) {
    return [];
  }

  return match[1].split('-').map(part => Number.parseInt(part, 10));
}

function compareRuntimeVersions(left, right) {
  const leftParts = extractRuntimeVersion(left);
  const rightParts = extractRuntimeVersion(right);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;

    if (leftPart !== rightPart) {
      return rightPart - leftPart;
    }
  }

  return 0;
}

function selectDevice(devicesJson) {
  const runtimeFilter = process.env.IOS_SIMULATOR_RUNTIME?.trim();
  const deviceFilter = process.env.IOS_SIMULATOR_DEVICE?.trim().toLowerCase();

  let runtimeKeys = Object.keys(devicesJson).filter(runtime =>
    runtime.includes('SimRuntime.iOS-'),
  );

  if (runtimeFilter) {
    const normalizedRuntime = normalizeRuntimeVersion(runtimeFilter);

    runtimeKeys = runtimeKeys.filter(runtime =>
      runtime.includes(`iOS-${normalizedRuntime}`),
    );

    if (runtimeKeys.length === 0) {
      throw new Error(`No iOS runtime matching "${runtimeFilter}" found`);
    }
  }

  runtimeKeys.sort(compareRuntimeVersions);

  const availableIPhones = runtimeKeys.flatMap(runtime =>
    devicesJson[runtime]
      .filter(device => device.isAvailable && device.name.startsWith('iPhone'))
      .map(device => ({
        name: device.name,
        udid: device.udid,
        runtime,
      })),
  );

  if (availableIPhones.length === 0) {
    throw new Error('No available iPhone simulators found');
  }

  if (deviceFilter) {
    const selectedDevice = availableIPhones.find(device =>
      device.name.toLowerCase().includes(deviceFilter),
    );

    if (!selectedDevice) {
      const availableNames = [
        ...new Set(availableIPhones.map(device => device.name)),
      ];
      throw new Error(
        `No available iPhone matching "${process.env.IOS_SIMULATOR_DEVICE}". Available: ${availableNames.join(', ')}`,
      );
    }

    return selectedDevice;
  }

  for (const deviceName of DEVICE_PRIORITY) {
    const prioritizedDevice = availableIPhones.find(
      device => device.name === deviceName,
    );

    if (prioritizedDevice) {
      return prioritizedDevice;
    }
  }

  return availableIPhones[0];
}

function runCommand(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: APP_ROOT,
    stdio: 'inherit',
    ...options,
  });
}

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function main() {
  const output = execFileSync(
    'xcrun',
    ['simctl', 'list', 'devices', 'available', '--json'],
    {
      encoding: 'utf8',
    },
  );
  const { devices } = JSON.parse(output);
  const simulator = selectDevice(devices);

  console.log(`Simulator: ${simulator.name} (${simulator.runtime})`);
  console.log(`UDID:      ${simulator.udid}`);

  try {
    runCommand('xcrun', ['simctl', 'shutdown', 'all']);
  } catch {
    // Benign on fresh machines with no booted simulators.
  }

  runCommand('xcrun', ['simctl', 'boot', simulator.udid]);
  runCommand('xcrun', ['simctl', 'bootstatus', simulator.udid, '-b']);
  sleep(5000);
  runCommand('yarn', [
    'react-native',
    'run-ios',
    '--scheme',
    'OpenPassport',
    '--udid',
    simulator.udid,
  ]);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`iOS simulator launch failed: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  compareRuntimeVersions,
  extractRuntimeVersion,
  main,
  normalizeRuntimeVersion,
  selectDevice,
};
