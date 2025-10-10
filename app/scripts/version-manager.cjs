#!/usr/bin/env node

// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Centralized Version Manager for Mobile Deployments
 *
 * Single source of truth for all version operations across:
 * - GitHub Actions workflows
 * - Fastlane (read-only consumption)
 * - Local development
 *
 * Version Bump Behavior (Option B - Continue build numbers):
 * - major: 2.6.9 → 3.0.0, increment build numbers
 * - minor: 2.6.9 → 2.7.0, increment build numbers
 * - patch: 2.6.9 → 2.6.10, increment build numbers
 * - build: 2.6.9 → 2.6.9, increment build numbers only
 *
 * Platform-specific logic:
 * - ios: Only increment iOS build number
 * - android: Only increment Android build number
 * - both/undefined: Increment both build numbers
 */

const fs = require('fs');
const path = require('path');

const APP_DIR = path.resolve(__dirname, '..');
const PACKAGE_JSON_PATH = path.join(APP_DIR, 'package.json');
const VERSION_JSON_PATH = path.join(APP_DIR, 'version.json');

/**
 * Read package.json
 */
function readPackageJson() {
  if (!fs.existsSync(PACKAGE_JSON_PATH)) {
    throw new Error(`package.json not found at ${PACKAGE_JSON_PATH}`);
  }

  try {
    return JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to parse package.json: ${error.message}`);
  }
}

/**
 * Read version.json
 */
function readVersionJson() {
  if (!fs.existsSync(VERSION_JSON_PATH)) {
    throw new Error(`version.json not found at ${VERSION_JSON_PATH}`);
  }

  try {
    return JSON.parse(fs.readFileSync(VERSION_JSON_PATH, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to parse version.json: ${error.message}`);
  }
}

/**
 * Write package.json
 */
function writePackageJson(data) {
  try {
    fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(data, null, 2) + '\n');
  } catch (error) {
    throw new Error(`Failed to write package.json: ${error.message}`);
  }
}

/**
 * Write version.json
 */
function writeVersionJson(data) {
  try {
    fs.writeFileSync(VERSION_JSON_PATH, JSON.stringify(data, null, 2) + '\n');
  } catch (error) {
    throw new Error(`Failed to write version.json: ${error.message}`);
  }
}

/**
 * Get current version information
 */
function getVersionInfo() {
  const pkg = readPackageJson();
  const versionData = readVersionJson();

  return {
    version: pkg.version,
    iosBuild: versionData.ios.build,
    androidBuild: versionData.android.build,
    iosLastDeployed: versionData.ios.lastDeployed,
    androidLastDeployed: versionData.android.lastDeployed,
  };
}

/**
 * Bump semantic version (major/minor/patch)
 */
function bumpSemanticVersion(currentVersion, bumpType) {
  const parts = currentVersion.split('.').map(Number);

  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(
      `Invalid version format: ${currentVersion}. Expected X.Y.Z`,
    );
  }

  let [major, minor, patch] = parts;

  switch (bumpType) {
    case 'major':
      major += 1;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor += 1;
      patch = 0;
      break;
    case 'patch':
      patch += 1;
      break;
    default:
      throw new Error(
        `Invalid bump type: ${bumpType}. Expected major, minor, or patch`,
      );
  }

  return `${major}.${minor}.${patch}`;
}

/**
 * Bump version and build numbers
 *
 * @param {string} bumpType - 'major', 'minor', 'patch', or 'build'
 * @param {string} platform - 'ios', 'android', or 'both' (default)
 * @returns {object} - New version info
 */
function bumpVersion(bumpType, platform = 'both') {
  const validBumpTypes = ['major', 'minor', 'patch', 'build'];
  const validPlatforms = ['ios', 'android', 'both'];

  if (!validBumpTypes.includes(bumpType)) {
    throw new Error(
      `Invalid bump type: ${bumpType}. Expected: ${validBumpTypes.join(', ')}`,
    );
  }

  if (!validPlatforms.includes(platform)) {
    throw new Error(
      `Invalid platform: ${platform}. Expected: ${validPlatforms.join(', ')}`,
    );
  }

  const pkg = readPackageJson();
  const versionData = readVersionJson();

  let newVersion = pkg.version;

  // Bump semantic version if major/minor/patch
  if (bumpType !== 'build') {
    newVersion = bumpSemanticVersion(pkg.version, bumpType);
    console.log(
      `📦 Bumping ${bumpType} version: ${pkg.version} → ${newVersion}`,
    );
  } else {
    console.log(`📦 Keeping version: ${newVersion} (build-only bump)`);
  }

  // Bump build numbers based on platform
  let newIosBuild = versionData.ios.build;
  let newAndroidBuild = versionData.android.build;

  if (platform === 'ios' || platform === 'both') {
    newIosBuild += 1;
    console.log(`🍎 iOS build: ${versionData.ios.build} → ${newIosBuild}`);
  } else {
    console.log(`🍎 iOS build: ${newIosBuild} (unchanged)`);
  }

  if (platform === 'android' || platform === 'both') {
    newAndroidBuild += 1;
    console.log(
      `🤖 Android build: ${versionData.android.build} → ${newAndroidBuild}`,
    );
  } else {
    console.log(`🤖 Android build: ${newAndroidBuild} (unchanged)`);
  }

  return {
    version: newVersion,
    iosBuild: newIosBuild,
    androidBuild: newAndroidBuild,
  };
}

/**
 * Apply version changes to files
 */
function applyVersions(version, iosBuild, androidBuild) {
  // Validate version format (semver X.Y.Z)
  if (
    !version ||
    typeof version !== 'string' ||
    !/^\d+\.\d+\.\d+$/.test(version)
  ) {
    throw new Error(`Invalid version format: ${version}. Expected X.Y.Z`);
  }

  // Validate and coerce build numbers
  const iosNum = Number(iosBuild);
  const androidNum = Number(androidBuild);

  if (!Number.isInteger(iosNum) || iosNum < 1) {
    throw new Error(`Invalid iOS build: ${iosBuild}. Must be positive integer`);
  }

  if (!Number.isInteger(androidNum) || androidNum < 1) {
    throw new Error(
      `Invalid Android build: ${androidBuild}. Must be positive integer`,
    );
  }

  console.log(`📝 Applying versions to files...`);
  console.log(`   Version: ${version}`);
  console.log(`   iOS Build: ${iosNum}`);
  console.log(`   Android Build: ${androidNum}`);

  // Update package.json
  const pkg = readPackageJson();
  pkg.version = version;
  writePackageJson(pkg);
  console.log(`✅ Updated package.json`);

  // Update version.json
  const versionData = readVersionJson();
  versionData.ios.build = iosNum;
  versionData.android.build = androidNum;
  writeVersionJson(versionData);
  console.log(`✅ Updated version.json`);
}

/**
 * CLI Interface
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'get': {
        // Get current version info
        const info = getVersionInfo();
        console.log(JSON.stringify(info, null, 2));

        // Also output for GitHub Actions
        if (process.env.GITHUB_OUTPUT) {
          const output = [
            `version=${info.version}`,
            `ios_build=${info.iosBuild}`,
            `android_build=${info.androidBuild}`,
          ].join('\n');
          fs.appendFileSync(process.env.GITHUB_OUTPUT, output + '\n');
        }
        break;
      }

      case 'bump': {
        // Bump version: bump <type> <platform>
        const bumpType = args[1] || 'build';
        const platform = args[2] || 'both';

        const result = bumpVersion(bumpType, platform);
        console.log(`\n✅ Version bump calculated:`);
        console.log(JSON.stringify(result, null, 2));

        // Output for GitHub Actions
        if (process.env.GITHUB_OUTPUT) {
          const output = [
            `version=${result.version}`,
            `ios_build=${result.iosBuild}`,
            `android_build=${result.androidBuild}`,
          ].join('\n');
          fs.appendFileSync(process.env.GITHUB_OUTPUT, output + '\n');
        }

        break;
      }

      case 'apply': {
        // Apply version: apply <version> <iosBuild> <androidBuild>
        const version = args[1];
        const iosBuild = parseInt(args[2], 10);
        const androidBuild = parseInt(args[3], 10);

        if (!version || isNaN(iosBuild) || isNaN(androidBuild)) {
          throw new Error('Usage: apply <version> <iosBuild> <androidBuild>');
        }

        applyVersions(version, iosBuild, androidBuild);
        console.log(`\n✅ Versions applied successfully`);
        break;
      }

      default:
        console.log(`
Mobile Version Manager

Usage:
  node version-manager.cjs <command> [options]

Commands:
  get                           Get current version information
  bump <type> <platform>        Bump version and calculate new build numbers
                                type: major|minor|patch|build (default: build)
                                platform: ios|android|both (default: both)
  apply <version> <ios> <android>  Apply specific version and build numbers

Examples:
  node version-manager.cjs get
  node version-manager.cjs bump build both
  node version-manager.cjs bump patch ios
  node version-manager.cjs apply 2.7.0 180 109
        `);
        process.exit(command ? 1 : 0);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run CLI if called directly
if (require.main === module) {
  main();
}

// Export functions for use as module
module.exports = {
  applyVersions,
  bumpVersion,
  getVersionInfo,
  readPackageJson,
  readVersionJson,
};
