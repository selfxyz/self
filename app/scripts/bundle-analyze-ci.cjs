#!/usr/bin/env node
// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { execSync } = require('child_process');
const { existsSync, statSync, unlinkSync } = require('fs');
const os = require('os');
const { join } = require('path');

const platform = process.argv[2];
if (!platform || !['android', 'ios'].includes(platform)) {
  console.error('Usage: bundle-analyze-ci.cjs <android|ios>');
  process.exit(1);
}

// Bundle size thresholds in MB - easy to update!
const BUNDLE_THRESHOLDS_MB = {
  // TODO: fix temporary bundle bump
  ios: 45,
  android: 45,
};

function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

function checkBundleSize(bundleSize, targetPlatform) {
  const thresholdMB = BUNDLE_THRESHOLDS_MB[targetPlatform];
  const thresholdBytes = thresholdMB * 1024 * 1024;

  console.log(`\n📦 Bundle size: ${formatBytes(bundleSize)}`);
  console.log(
    `🎯 Threshold: ${thresholdMB}MB (${formatBytes(thresholdBytes)})`,
  );

  if (bundleSize > thresholdBytes) {
    const overage = bundleSize - thresholdBytes;
    console.error(
      `\n❌ Bundle size exceeds threshold by ${formatBytes(overage)}!`,
    );
    console.error(`   Current: ${formatBytes(bundleSize)}`);
    console.error(`   Threshold: ${thresholdMB}MB`);
    console.error(`   Please reduce bundle size to continue.`);
    console.error(
      `\n💡 To increase the threshold, edit BUNDLE_THRESHOLDS_MB in this script.`,
    );
    return false;
  } else {
    const remaining = thresholdBytes - bundleSize;
    console.log(
      `✅ Bundle size is within threshold (${formatBytes(remaining)} remaining)`,
    );
    return true;
  }
}

// Use Metro's built-in bundle command
const tmpDir = os.tmpdir();
const bundleFile = join(tmpDir, `${platform}.bundle`);
const sourcemapFile = join(tmpDir, `${platform}.bundle.map`);

console.log(`🔨 Generating ${platform} bundle using Metro...`);

try {
  execSync(
    `npx react-native bundle ` +
      `--platform ${platform} ` +
      `--dev false ` +
      `--entry-file index.js ` +
      `--bundle-output ${bundleFile} ` +
      `--sourcemap-output ${sourcemapFile} ` +
      `--minify false ` +
      `--config metro.config.cjs ` +
      `--reset-cache`,
    {
      stdio: 'inherit',
    },
  );
} catch (error) {
  console.error(`❌ Failed to generate bundle: ${error.message}`);
  process.exit(1);
}

// Check bundle size against threshold
if (existsSync(bundleFile)) {
  const bundleSize = statSync(bundleFile).size;
  console.log(`📁 Bundle generated at: ${bundleFile}`);
  if (!checkBundleSize(bundleSize, platform)) {
    process.exit(1);
  }

  // Clean up temporary files
  try {
    unlinkSync(bundleFile);
    unlinkSync(sourcemapFile);
    console.log('🧹 Cleaned up temporary bundle files');
  } catch (cleanupError) {
    console.warn(
      '⚠️  Could not clean up temporary files:',
      cleanupError.message,
    );
  }
} else {
  console.error(`❌ Bundle file not found at ${bundleFile}`);
  process.exit(1);
}
