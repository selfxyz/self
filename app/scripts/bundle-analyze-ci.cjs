#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const platform = process.argv[2];
if (!platform || !['android', 'ios'].includes(platform)) {
  console.error('Usage: bundle-analyze-ci.cjs <android|ios>');
  process.exit(1);
}

// Bundle size thresholds in MB - easy to update!
const BUNDLE_THRESHOLDS_MB = {
  ios: 36,
  android: 36,
};

function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

function checkBundleSize(bundleSize, platform) {
  const thresholdMB = BUNDLE_THRESHOLDS_MB[platform];
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
const bundleFile = path.join(tmpDir, `${platform}.bundle`);
const sourcemapFile = path.join(tmpDir, `${platform}.bundle.map`);

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
if (fs.existsSync(bundleFile)) {
  const bundleSize = fs.statSync(bundleFile).size;
  console.log(`📁 Bundle generated at: ${bundleFile}`);
  if (!checkBundleSize(bundleSize, platform)) {
    process.exit(1);
  }

  // Clean up temporary files
  try {
    fs.unlinkSync(bundleFile);
    fs.unlinkSync(sourcemapFile);
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
