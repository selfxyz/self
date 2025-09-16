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
const githubToken = process.env.GITHUB_TOKEN;
const isDryRun = process.env.DRY_RUN === 'true';

function log(message, type = 'info') {
  const prefix = {
    info: '🔧',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    cleanup: '🗑️'
  }[type] || '📝';

  console.log(`${prefix} ${message}`);
}

function runCommand(command, options = {}) {
  const defaultOptions = {
    stdio: isDryRun ? 'pipe' : 'inherit',
    cwd: ANDROID_DIR,
    encoding: 'utf8',
    ...options
  };

  try {
    if (isDryRun) {
      log(`[DRY RUN] Would run: ${command}`, 'info');
      return '';
    }

    log(`Running: ${command}`, 'info');
    return execSync(command, defaultOptions);
  } catch (error) {
    log(`Failed to run: ${command}`, 'error');
    log(`Error: ${error.message}`, 'error');
    throw error;
  }
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
        retryDelay: 1000
      });
    }

    log(`Removed existing ${REPO_NAME}`, 'success');
  }
}

function clonePrivateRepo() {
  log(`Setting up ${REPO_NAME}...`, 'info');

  let cloneUrl;

  if (isCI && githubToken) {
    // CI environment with Personal Access Token
    log('CI detected: Using GITHUB_TOKEN for clone', 'info');
    cloneUrl = `https://${githubToken}@github.com/${GITHUB_ORG}/${REPO_NAME}.git`;
  } else if (isCI) {
    log('CI environment detected but GITHUB_TOKEN not available', 'error');
    throw new Error('CI requires GITHUB_TOKEN environment variable');
  } else {
    // Local development with SSH
    log('Local development: Using SSH for clone', 'info');
    cloneUrl = `git@github.com:${GITHUB_ORG}/${REPO_NAME}.git`;
  }

  const cloneCommand = `git clone --branch ${BRANCH} --single-branch --depth 1 "${cloneUrl}" android-passport-reader`;

  try {
    runCommand(cloneCommand);
    log(`Successfully cloned ${REPO_NAME}`, 'success');
  } catch (error) {
    if (isCI) {
      log('Clone failed in CI environment. Check GITHUB_TOKEN permissions.', 'error');
    } else {
      log('Clone failed. Ensure you have SSH access to the repository.', 'error');
    }
    throw error;
  }
}

function validateSetup() {
  const expectedFiles = [
    'app/build.gradle',
    'app/src/main/AndroidManifest.xml'
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
  try {
    log(`Starting setup of ${REPO_NAME}...`, 'info');

    // Ensure android directory exists
    if (!fs.existsSync(ANDROID_DIR)) {
      throw new Error(`Android directory not found: ${ANDROID_DIR}`);
    }

    // Remove existing module
    removeExistingModule();

    // Clone the private repository
    clonePrivateRepo();

    // Validate the setup
    if (!isDryRun) {
      validateSetup();
    }

    log(`${REPO_NAME} setup complete!`, 'success');
  } catch (error) {
    log(`Setup failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Script execution
if (require.main === module) {
  setupAndroidPassportReader();
}

module.exports = {
  setupAndroidPassportReader,
  removeExistingModule,
  PRIVATE_MODULE_PATH
};
