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

const warning = Number(process.env.BUNDLE_WARNING_INCREASE || '0');

function sanitize(str) {
  return str ? str.replace(/[^\w]/g, '') : str;
}

function getAppName() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    if (pkg.name) return sanitize(pkg.name);
  } catch {}
  try {
    const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app.json'), 'utf8'));
    return sanitize(appJson.name || (appJson.expo && appJson.expo.name));
  } catch {}
  return 'UnknownApp';
}

const baseDir = path.join(os.tmpdir(), 'react-native-bundle-visualizer');
const tmpDir = path.join(baseDir, getAppName());
const bundleFile = path.join(tmpDir, `${platform}.bundle`);
let prevSize = 0;
if (fs.existsSync(bundleFile)) prevSize = fs.statSync(bundleFile).size;

execSync(`react-native-bundle-visualizer --platform ${platform} --dev`, { stdio: 'inherit' });

if (fs.existsSync(bundleFile) && warning > 0) {
  const newSize = fs.statSync(bundleFile).size;
  const delta = newSize - prevSize;
  if (delta > warning) {
    console.warn(`\u26A0\uFE0F Bundle increased by ${delta} bytes (threshold ${warning}).`);
  }
}
