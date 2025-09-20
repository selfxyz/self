// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const {
  removeExistingModule,
  PRIVATE_MODULE_PATH,
} = require('./setup-private-modules.cjs');
const fs = require('fs');

function cleanupPrivateModules() {
  console.log('🧹 Cleaning up private modules...');

  try {
    if (fs.existsSync(PRIVATE_MODULE_PATH)) {
      removeExistingModule();
      console.log('✅ Private modules cleanup complete');
    } else {
      console.log('✅ No private modules to clean up');
    }
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

// Script execution
if (require.main === module) {
  cleanupPrivateModules();
}

module.exports = { cleanupPrivateModules };
