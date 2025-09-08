#!/usr/bin/env node

// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SDK_ROOT = path.resolve(__dirname, '..');
const DEMO_APP = path.resolve(SDK_ROOT, '../mobile-sdk-demo');

console.log('🔨 Building Self Mobile SDK Alpha...');
console.log('📁 SDK Root:', SDK_ROOT);
console.log('📱 Demo App:', DEMO_APP);

try {
  // Step 1: Build the SDK
  console.log('\n📦 Building SDK...');
  execSync('yarn build', { cwd: SDK_ROOT, stdio: 'inherit' });

  // Step 2: Validate demo app can build
  console.log('\n✅ Validating demo app...');
  execSync('yarn build', { cwd: DEMO_APP, stdio: 'inherit' });

  console.log('\n🎉 Build completed successfully!');
  console.log('📱 Demo app is ready to run:');
  console.log('   yarn demo:android  # Run on Android');
  console.log('   yarn demo:ios      # Run on iOS');
  console.log('   yarn demo:start    # Start Metro bundler');
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}
