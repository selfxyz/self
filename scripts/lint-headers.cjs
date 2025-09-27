#!/usr/bin/env node
// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { execSync } = require('child_process');

function runCommand(command, description) {
  try {
    console.log(`🔍 ${description}...`);
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
  } catch (error) {
    console.error(`❌ ${description} failed`);
    process.exit(1);
  }
}

function main() {
  const isFix = process.argv.includes('--fix');

  runCommand(
    'node scripts/check-duplicate-headers.cjs app packages/mobile-sdk-alpha',
    'Checking for duplicate license headers'
  );

  const checkCommand = isFix ? '--fix' : '--check';
  runCommand(
    `node scripts/check-license-headers.mjs app packages/mobile-sdk-alpha ${checkCommand}`,
    isFix ? 'Fixing license headers' : 'Checking license headers'
  );

  console.log('✅ All license header checks completed successfully');
}

if (require.main === module) {
  main();
}
