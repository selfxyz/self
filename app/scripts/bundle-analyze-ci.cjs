#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const platform = process.argv[2];
if (!platform) {
  console.error('Usage: bundle-analyze-ci.cjs <platform>');
  process.exit(1);
}

// Bundle size thresholds in MB - easy to update!
const BUNDLE_THRESHOLDS_MB = {
  ios: 36,
  android: 36,
};

function sanitize(str) {
  return str ? str.replace(/[^\w]/g, '') : str;
}

function getAppName() {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'),
    );
    if (pkg.name) return sanitize(pkg.name);
  } catch {}
  try {
    const appJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'app.json'), 'utf8'),
    );
    return sanitize(appJson.name || (appJson.expo && appJson.expo.name));
  } catch {}
  return 'UnknownApp';
}

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

const baseDir = path.join(os.tmpdir(), 'react-native-bundle-visualizer');
const tmpDir = path.join(baseDir, getAppName());
const bundleFile = path.join(tmpDir, `${platform}.bundle`);

execSync(`react-native-bundle-visualizer --platform ${platform} --dev`, {
  stdio: 'inherit',
});

// Check bundle size against threshold
if (fs.existsSync(bundleFile)) {
  const bundleSize = fs.statSync(bundleFile).size;
  if (!checkBundleSize(bundleSize, platform)) {
    process.exit(1);
  }
} else {
  console.error(`❌ Bundle file not found at ${bundleFile}`);
  process.exit(1);
}
