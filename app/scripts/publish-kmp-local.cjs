// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Publishes the kmp-sdk shared Android artifact (xyz.self.sdk:shared-android)
// to the local Maven repository. @selfxyz/rn-sdk's SelfBridgeModule.kt compiles
// `compileOnly` against this coordinate, so a stale or missing local AAR breaks
// `:selfxyz_rn-sdk:compileDebugKotlin` during the app's Android build. Refreshing
// it here keeps the bridge in sync with the kmp-sdk source on every Android build.
// Remove once SD-06 (SELF-2534) replaces the local coordinate with a hosted one.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = __dirname;
const APP_DIR = path.dirname(SCRIPT_DIR);
const REPO_ROOT = path.dirname(APP_DIR);
const KMP_DIR = path.join(REPO_ROOT, 'packages', 'kmp-sdk');

// Android-only publication: avoids the iOS metadata compile path, which is
// unnecessary here and currently fails an unrelated Gradle task-dependency check.
const GRADLE_TASK = ':shared:publishAndroidReleasePublicationToMavenLocal';

function log(message) {
  console.log(`🔧 ${message}`);
}

function main() {
  if (!fs.existsSync(path.join(KMP_DIR, 'gradlew'))) {
    log(`kmp-sdk not found at ${KMP_DIR}; skipping local AAR publish`);
    return;
  }

  log(
    `Publishing xyz.self.sdk:shared-android to mavenLocal (${GRADLE_TASK})...`,
  );
  execSync(`./gradlew ${GRADLE_TASK}`, { cwd: KMP_DIR, stdio: 'inherit' });
  log('Published kmp-sdk shared-android to mavenLocal');
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    log(`Failed to publish kmp-sdk shared-android: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { main };
