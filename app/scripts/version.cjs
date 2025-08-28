#!/usr/bin/env node
// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

const VERSION_FILE = join(__dirname, '..', 'version.json');
const PACKAGE_JSON = join(__dirname, '..', 'package.json');

function readVersionFile() {
  try {
    const data = readFileSync(VERSION_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading version.json:', error);
    process.exit(1);
  }
}

function writeVersionFile(data) {
  try {
    writeFileSync(VERSION_FILE, JSON.stringify(data, null, 2) + '\n');
  } catch (error) {
    console.error('Error writing version.json:', error);
    process.exit(1);
  }
}

function getPackageVersion() {
  try {
    const packageData = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8'));
    return packageData.version;
  } catch (error) {
    console.error('Error reading package.json:', error);
    process.exit(1);
  }
}

function bumpBuild(platform = 'both') {
  const validPlatforms = ['ios', 'android', 'both'];
  if (!validPlatforms.includes(platform)) {
    console.error(
      `Invalid platform: ${platform}. Must be one of: ${validPlatforms.join(', ')}`,
    );
    process.exit(1);
  }

  const versionData = readVersionFile();

  if (platform === 'ios' || platform === 'both') {
    versionData.ios.build += 1;
    console.log(`✅ iOS build number bumped to ${versionData.ios.build}`);
  }

  if (platform === 'android' || platform === 'both') {
    versionData.android.build += 1;
    console.log(
      `✅ Android build number bumped to ${versionData.android.build}`,
    );
  }

  writeVersionFile(versionData);
}

function setDeploymentTime(platform) {
  const validPlatforms = ['ios', 'android', 'both'];
  if (!validPlatforms.includes(platform)) {
    console.error(
      `Invalid platform: ${platform}. Must be one of: ${validPlatforms.join(', ')}`,
    );
    process.exit(1);
  }

  const versionData = readVersionFile();
  const timestamp = new Date().toISOString();

  if (platform === 'ios' || platform === 'both') {
    versionData.ios.lastDeployed = timestamp;
  }

  if (platform === 'android' || platform === 'both') {
    versionData.android.lastDeployed = timestamp;
  }

  writeVersionFile(versionData);
  console.log(`✅ Updated ${platform} deployment timestamp`);
}

function getCurrentInfo() {
  const versionData = readVersionFile();
  const version = getPackageVersion();

  console.log(`Current version: ${version} (from package.json)`);
  console.log(`iOS build: ${versionData.ios.build}`);
  console.log(`Android build: ${versionData.android.build}`);

  if (versionData.ios.lastDeployed) {
    console.log(`iOS last deployed: ${versionData.ios.lastDeployed}`);
  }
  if (versionData.android.lastDeployed) {
    console.log(`Android last deployed: ${versionData.android.lastDeployed}`);
  }

  return { version, ...versionData };
}

// CLI handling
const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'bump-build':
    bumpBuild(arg || 'both');
    break;
  case 'deployed':
    setDeploymentTime(arg || 'both');
    break;
  case 'get':
  case 'info':
    getCurrentInfo();
    break;
  default:
    console.log('Usage:');
    console.log(
      '  node version.cjs bump-build [ios|android|both]  - Bump build number',
    );
    console.log(
      '  node version.cjs deployed [ios|android|both]     - Update deployment timestamp',
    );
    console.log(
      '  node version.cjs info                            - Get current version info',
    );
    console.log('');
    console.log('Note: Version numbers are managed by npm version command');
    process.exit(1);
}
