// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Constants
const SCRIPT_DIR = __dirname;
const SDK_DIR = path.dirname(SCRIPT_DIR);
const PRIVATE_MODULE_PATH = path.join(SDK_DIR, 'mobile-sdk-native');

const GITHUB_ORG = 'selfxyz';
const REPO_NAME = 'mobile-sdk-native';
const BRANCH = 'main';

// Environment detection
const isCI = process.env.CI === 'true';
const repoToken = process.env.SELFXYZ_INTERNAL_REPO_PAT;
const appToken = process.env.SELFXYZ_APP_TOKEN; // GitHub App installation token
const isDryRun = process.env.DRY_RUN === 'true';

function log(message, type = 'info') {
  const prefix =
    {
      info: '🔧',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      cleanup: '🗑️',
    }[type] || '📝';

  console.log(`${prefix} ${message}`);
}

function runCommand(command, options = {}) {
  const defaultOptions = {
    stdio: isDryRun ? 'pipe' : 'inherit',
    cwd: SDK_DIR,
    encoding: 'utf8',
    ...options,
  };

  // Sanitize command for logging to prevent credential exposure
  const sanitizedCommand = sanitizeCommandForLogging(command);

  try {
    if (isDryRun) {
      log(`[DRY RUN] Would run: ${sanitizedCommand}`, 'info');
      return '';
    }

    log(`Running: ${sanitizedCommand}`, 'info');
    return execSync(command, defaultOptions);
  } catch (error) {
    log(`Failed to run: ${sanitizedCommand}`, 'error');
    log(`Error: ${error.message}`, 'error');
    throw error;
  }
}

function sanitizeCommandForLogging(command) {
  // Replace any https://token@github.com patterns with https://[REDACTED]@github.com
  return command.replace(/https:\/\/[^@]+@github\.com/g, 'https://[REDACTED]@github.com');
}

// function removeExistingModule() {
//   if (fs.existsSync(PRIVATE_MODULE_PATH)) {
//     log(`Removing existing ${REPO_NAME} directory...`, 'cleanup');
//     runCommand(`rm -rf "${PRIVATE_MODULE_PATH}"`);
//   }
// }

function usingHTTPSGitAuth() {
  try {
    const result = execSync('git config --get remote.origin.url', {
      encoding: 'utf8',
      cwd: SDK_DIR,
    });
    return result.trim().startsWith('https://');
  } catch {
    log('Could not determine git remote URL, assuming SSH authentication', 'warning');
    return false;
  }
}

function setupSubmodule() {
  log(`Setting up ${REPO_NAME} as submodule...`, 'info');

  let submoduleUrl;

  if (isCI && appToken) {
    // CI environment with GitHub App installation token
    // Security: NEVER embed credentials in git URLs. Rely on CI-provided auth via:
    // - ~/.netrc, a Git credential helper, or SSH agent configuration.
    submoduleUrl = `https://github.com/${GITHUB_ORG}/${REPO_NAME}.git`;
  } else if (isCI && repoToken) {
    // CI environment with Personal Access Token
    // Security: NEVER embed credentials in git URLs. Rely on CI-provided auth via:
    // - ~/.netrc, a Git credential helper, or SSH agent configuration.
    submoduleUrl = `https://github.com/${GITHUB_ORG}/${REPO_NAME}.git`;
  } else if (isCI) {
    log('CI environment detected but no token available - skipping private module setup', 'info');
    log('This is expected for forked PRs or environments without access to private modules', 'info');
    return false; // Return false to indicate setup was skipped
  } else if (usingHTTPSGitAuth()) {
    submoduleUrl = `https://github.com/${GITHUB_ORG}/${REPO_NAME}.git`;
  } else {
    // Local development with SSH
    submoduleUrl = `git@github.com:${GITHUB_ORG}/${REPO_NAME}.git`;
  }

  try {
    // Check if submodule already exists
    if (fs.existsSync(PRIVATE_MODULE_PATH)) {
      log('Submodule already exists, updating...', 'info');
      runCommand(`git submodule update --init --recursive mobile-sdk-native`);
    } else {
      // Add submodule
      const addCommand = `git submodule add -b ${BRANCH} "${submoduleUrl}" mobile-sdk-native`;
      if (isCI && (appToken || repoToken)) {
        // Security: Run command silently to avoid token exposure in logs
        runCommand(addCommand, { stdio: 'pipe' });
      } else {
        runCommand(addCommand);
      }
    }

    log(`Successfully set up ${REPO_NAME} as submodule`, 'success');
    return true; // Return true to indicate successful setup
  } catch (error) {
    if (isCI) {
      log('Submodule setup failed in CI environment. Check repository access/credentials configuration.', 'error');
    } else {
      log('Submodule setup failed. Ensure you have SSH access to the repository.', 'error');
    }
    throw error;
  }
}

function validateSetup() {
  const expectedFiles = ['src/main/java', 'src/main/res'];

  for (const file of expectedFiles) {
    const fullPath = path.join(PRIVATE_MODULE_PATH, file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Required file not found: ${file}`);
    }
  }

  log('Private module validation passed', 'success');
}

function scrubGitRemoteUrl() {
  try {
    const cleanUrl = `https://github.com/${GITHUB_ORG}/${REPO_NAME}.git`;
    runCommand(`git -C mobile-sdk-native remote set-url origin "${cleanUrl}"`, { stdio: 'pipe' });
    log('Git remote URL scrubbed of credentials', 'success');
  } catch {
    log('Failed to scrub git remote URL (non-critical)', 'warning');
  }
}

function setupMobileSDKNative() {
  log(`Starting setup of ${REPO_NAME} as submodule...`, 'info');

  // Setup the submodule
  const setupSuccessful = setupSubmodule();

  // If setup was skipped (e.g., in forked PRs), exit gracefully
  if (setupSuccessful === false) {
    log(`${REPO_NAME} setup skipped - private module not available`, 'warning');
    return;
  }

  // Security: Remove credential-embedded remote URL after setup
  if (isCI && (appToken || repoToken) && !isDryRun) {
    scrubGitRemoteUrl();
  }

  // Validate the setup
  if (!isDryRun) {
    validateSetup();
  }

  log(`${REPO_NAME} submodule setup complete!`, 'success');
  log('💡 You can now work directly in mobile-sdk-native/ with full git history', 'info');
}

// Main execution
if (require.main === module) {
  setupMobileSDKNative();
}

module.exports = { setupMobileSDKNative };
