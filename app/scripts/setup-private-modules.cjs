// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Constants
const SCRIPT_DIR = __dirname;
const APP_DIR = path.dirname(SCRIPT_DIR);
const ANDROID_DIR = path.join(APP_DIR, 'android');
const PRIVATE_MODULE_PATH = path.join(ANDROID_DIR, 'android-passport-reader');

const GITHUB_ORG = 'selfxyz';
const REPO_NAME = 'android-passport-reader';
const BRANCH = 'main';

// Environment detection
const isCI = process.env.CI === 'true';
const repoToken = process.env.SELFXYZ_INTERNAL_REPO_PAT;
const isDryRun = process.env.DRY_RUN === 'true';

// Platform detection for Android-specific modules
function shouldSetupAndroidModule() {
  // In CI, check for platform-specific indicators
  if (isCI) {
    const platform = process.env.PLATFORM || process.env.INPUT_PLATFORM;
    if (platform === 'ios') {
      log('Detected iOS platform, skipping Android module setup', 'info');
      return false;
    }
    if (platform === 'android') {
      log(
        'Detected Android platform, proceeding with Android module setup',
        'info',
      );
      return true;
    }
  }

  // For local development, only setup if Android directory exists and we're likely building Android
  if (fs.existsSync(ANDROID_DIR)) {
    log('Android directory detected for local development', 'info');
    return true;
  }

  log(
    'No Android build context detected, skipping Android module setup',
    'warning',
  );
  return false;
}

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
    cwd: ANDROID_DIR,
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
  return command.replace(
    /https:\/\/[^@]+@github\.com/g,
    'https://[REDACTED]@github.com',
  );
}

function removeExistingModule() {
  if (fs.existsSync(PRIVATE_MODULE_PATH)) {
    log(`Removing existing ${REPO_NAME}...`, 'cleanup');

    if (!isDryRun) {
      // Force remove even if it's a git repo
      fs.rmSync(PRIVATE_MODULE_PATH, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 1000,
      });
    }

    log(`Removed existing ${REPO_NAME}`, 'success');
  }
}

function clonePrivateRepo() {
  log(`Setting up ${REPO_NAME}...`, 'info');

  let cloneUrl;

  if (isCI && repoToken) {
    // CI environment with Personal Access Token
    log('CI detected: Using SELFXYZ_INTERNAL_REPO_PAT for clone', 'info');
    cloneUrl = `https://${repoToken}@github.com/${GITHUB_ORG}/${REPO_NAME}.git`;
  } else if (isCI) {
    log(
      'CI environment detected but SELFXYZ_INTERNAL_REPO_PAT not available - skipping private module setup',
      'info',
    );
    log(
      'This is expected for forked PRs or environments without access to private modules',
      'info',
    );
    return false; // Return false to indicate clone was skipped
  } else {
    // Local development with SSH
    log('Local development: Using SSH for clone', 'info');
    cloneUrl = `git@github.com:${GITHUB_ORG}/${REPO_NAME}.git`;
  }

  // Security: Use quiet mode for credentialed URLs to prevent token exposure
  const isCredentialedUrl = isCI && repoToken;
  const quietFlag = isCredentialedUrl ? '--quiet' : '';
  const cloneCommand = `git clone --branch ${BRANCH} --single-branch --depth 1 ${quietFlag} "${cloneUrl}" android-passport-reader`;

  try {
    if (isCredentialedUrl) {
      // Security: Run command silently to avoid token exposure in logs
      runCommand(cloneCommand, { stdio: 'pipe' });
    } else {
      runCommand(cloneCommand);
    }
    log(`Successfully cloned ${REPO_NAME}`, 'success');
    return true; // Return true to indicate successful clone
  } catch (error) {
    if (isCI) {
      log(
        'Clone failed in CI environment. Check SELFXYZ_INTERNAL_REPO_PAT permissions.',
        'error',
      );
    } else {
      log(
        'Clone failed. Ensure you have SSH access to the repository.',
        'error',
      );
    }
    throw error;
  }
}

function validateSetup() {
  const expectedFiles = [
    'app/build.gradle',
    'app/src/main/AndroidManifest.xml',
  ];

  for (const file of expectedFiles) {
    const filePath = path.join(PRIVATE_MODULE_PATH, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Expected file not found: ${file}`);
    }
  }

  log('Private module validation passed', 'success');
}

function setupAndroidPassportReader() {
  log(`Starting setup of ${REPO_NAME}...`, 'info');

  // Ensure android directory exists
  if (!fs.existsSync(ANDROID_DIR)) {
    throw new Error(`Android directory not found: ${ANDROID_DIR}`);
  }

  // Remove existing module
  removeExistingModule();

  // Clone the private repository
  const cloneSuccessful = clonePrivateRepo();

  // If clone was skipped (e.g., in forked PRs), exit gracefully
  if (cloneSuccessful === false) {
    log(`${REPO_NAME} setup skipped - private module not available`, 'warning');
    return;
  }

  // Security: Remove credential-embedded remote URL after clone
  if (isCI && repoToken && !isDryRun) {
    scrubGitRemoteUrl();
  }

  // Validate the setup
  if (!isDryRun) {
    validateSetup();
  }

  log(`${REPO_NAME} setup complete!`, 'success');
}

function scrubGitRemoteUrl() {
  try {
    const cleanUrl = `https://github.com/${GITHUB_ORG}/${REPO_NAME}.git`;
    const scrubCommand = `cd "${PRIVATE_MODULE_PATH}" && git remote set-url origin "${cleanUrl}"`;

    log('Scrubbing credential from git remote URL...', 'info');
    runCommand(scrubCommand, { stdio: 'pipe' });
    log('Git remote URL cleaned', 'success');
  } catch (error) {
    log(`Warning: Failed to scrub git remote URL: ${error.message}`, 'warning');
    // Non-fatal error - continue execution
  }
}

// Script execution
if (require.main === module) {
  if (!shouldSetupAndroidModule()) {
    log('Skipping Android module setup based on platform detection', 'warning');
    process.exit(0);
  }

  try {
    setupAndroidPassportReader();
  } catch (error) {
    log(`Setup failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

module.exports = {
  setupAndroidPassportReader,
  removeExistingModule,
  PRIVATE_MODULE_PATH,
};
