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

const GITHUB_ORG = 'selfxyz';
const BRANCH = 'main';

const PRIVATE_MODULES = [
  {
    repoName: 'android-passport-nfc-reader',
    localPath: path.join(ANDROID_DIR, 'android-passport-nfc-reader'),
    validationFiles: ['app/build.gradle', 'app/src/main/AndroidManifest.xml'],
  },
  {
    repoName: 'react-native-passport-reader',
    localPath: path.join(ANDROID_DIR, 'react-native-passport-reader'),
    validationFiles: ['android/build.gradle'],
  },
];

// Environment detection
// CI is set by GitHub Actions, CircleCI, etc. Check for truthy value
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const repoToken = process.env.SELFXYZ_INTERNAL_REPO_PAT;
const appToken = process.env.SELFXYZ_APP_TOKEN; // GitHub App installation token
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

function removeExistingModule(modulePath, repoName) {
  if (fs.existsSync(modulePath)) {
    log(`Removing existing ${repoName}...`, 'cleanup');

    if (!isDryRun) {
      // Force remove even if it's a git repo
      fs.rmSync(modulePath, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 1000,
      });
    }

    log(`Removed existing ${repoName}`, 'success');
  }
}
// some of us connect to github via SSH, others via HTTPS with gh auth
function usingHTTPSGitAuth() {
  try {
    const authData = runCommand(`gh auth status`, { stdio: 'pipe' });
    const authInfo = authData.toString();
    return (
      authInfo.includes('Logged in to github.com account') &&
      authInfo.includes('Git operations protocol: https')
    );
  } catch {
    console.info(
      'gh auth status failed, assuming no HTTPS auth -- will try SSH',
    );
    return false;
  }
}

function clonePrivateRepo(repoName, localPath) {
  log(`Setting up ${repoName}...`, 'info');

  let cloneUrl;

  if (isCI && appToken) {
    // CI environment with GitHub App installation token
    log('CI detected: Using SELFXYZ_APP_TOKEN for clone', 'info');
    cloneUrl = `https://x-access-token:${appToken}@github.com/${GITHUB_ORG}/${repoName}.git`;
  } else if (isCI && repoToken) {
    // CI environment with Personal Access Token
    log('CI detected: Using SELFXYZ_INTERNAL_REPO_PAT for clone', 'info');
    cloneUrl = `https://${repoToken}@github.com/${GITHUB_ORG}/${repoName}.git`;
  } else if (isCI) {
    log(
      'CI environment detected but no token available - skipping private module setup',
      'info',
    );
    log(
      'This is expected for forked PRs or environments without access to private modules',
      'info',
    );
    return false; // Return false to indicate clone was skipped
  } else if (usingHTTPSGitAuth()) {
    cloneUrl = `https://github.com/${GITHUB_ORG}/${repoName}.git`;
  } else {
    // Local development with SSH
    log('Local development: Using SSH for clone', 'info');
    cloneUrl = `git@github.com:${GITHUB_ORG}/${repoName}.git`;
  }

  // Security: Use quiet mode for credentialed URLs to prevent token exposure
  const isCredentialedUrl = isCI && (appToken || repoToken);
  const quietFlag = isCredentialedUrl ? '--quiet' : '';
  const targetDir = path.basename(localPath);
  const cloneCommand = `git clone --branch ${BRANCH} --single-branch --depth 1 ${quietFlag} "${cloneUrl}" "${targetDir}"`;

  try {
    if (isCredentialedUrl) {
      // Security: Run command silently to avoid token exposure in logs
      runCommand(cloneCommand, { stdio: 'pipe' });
    } else {
      runCommand(cloneCommand);
    }
    log(`Successfully cloned ${repoName}`, 'success');
    return true; // Return true to indicate successful clone
  } catch (error) {
    if (isCI) {
      log(
        'Clone failed in CI environment. Check SELFXYZ_APP_TOKEN or SELFXYZ_INTERNAL_REPO_PAT permissions.',
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

function validateSetup(modulePath, validationFiles, repoName) {
  for (const file of validationFiles) {
    const filePath = path.join(modulePath, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Expected file not found in ${repoName}: ${file}`);
    }
  }

  log(`${repoName} validation passed`, 'success');
}

function setupPrivateModule(module) {
  const { repoName, localPath, validationFiles } = module;
  log(`Starting setup of ${repoName}...`, 'info');

  // Remove existing module
  removeExistingModule(localPath, repoName);

  // Clone the private repository
  const cloneSuccessful = clonePrivateRepo(repoName, localPath);

  // If clone was skipped (e.g., in forked PRs), exit gracefully
  if (cloneSuccessful === false) {
    log(`${repoName} setup skipped - private module not available`, 'warning');
    return false;
  }

  // Security: Remove credential-embedded remote URL after clone
  if (isCI && (appToken || repoToken) && !isDryRun) {
    scrubGitRemoteUrl(localPath, repoName);
  }

  // Validate the setup
  if (!isDryRun) {
    validateSetup(localPath, validationFiles, repoName);
  }

  log(`${repoName} setup complete!`, 'success');
  return true;
}

function setupAndroidPassportReader() {
  // Ensure android directory exists
  if (!fs.existsSync(ANDROID_DIR)) {
    throw new Error(`Android directory not found: ${ANDROID_DIR}`);
  }

  log(
    `Starting setup of ${PRIVATE_MODULES.length} private module(s)...`,
    'info',
  );

  let successCount = 0;
  for (const module of PRIVATE_MODULES) {
    try {
      const success = setupPrivateModule(module);
      if (success) {
        successCount++;
      }
    } catch (error) {
      log(`Failed to setup ${module.repoName}: ${error.message}`, 'error');
      throw error;
    }
  }

  if (successCount === PRIVATE_MODULES.length) {
    log('All private modules setup complete!', 'success');
  } else if (successCount > 0) {
    log(
      `Setup complete: ${successCount}/${PRIVATE_MODULES.length} modules cloned`,
      'warning',
    );
  } else {
    log(
      'No private modules were cloned - this is expected for forked PRs',
      'info',
    );
  }
}

function scrubGitRemoteUrl(modulePath, repoName) {
  try {
    const cleanUrl = `https://github.com/${GITHUB_ORG}/${repoName}.git`;
    const scrubCommand = `cd "${modulePath}" && git remote set-url origin "${cleanUrl}"`;

    log(`Scrubbing credential from git remote URL for ${repoName}...`, 'info');
    runCommand(scrubCommand, { stdio: 'pipe' });
    log(`Git remote URL cleaned for ${repoName}`, 'success');
  } catch (error) {
    log(
      `Warning: Failed to scrub git remote URL for ${repoName}: ${error.message}`,
      'warning',
    );
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
  PRIVATE_MODULES,
};
