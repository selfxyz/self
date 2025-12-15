// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Constants
const SCRIPT_DIR = __dirname;
const SDK_DIR = path.dirname(SCRIPT_DIR);
const REPO_ROOT = path.resolve(SDK_DIR, '../../');
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

function runCommand(command, options = {}, cwd = SDK_DIR) {
  const defaultOptions = {
    stdio: isDryRun ? 'pipe' : 'inherit',
    cwd: cwd,
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
    // Check if submodule is registered in .gitmodules (at repo root)
    const gitmodulesPath = path.join(REPO_ROOT, '.gitmodules');
    const gitmodulesExists = fs.existsSync(gitmodulesPath);
    const gitmodulesContent = gitmodulesExists ? fs.readFileSync(gitmodulesPath, 'utf8') : '';
    const isSubmoduleRegistered =
      gitmodulesExists && gitmodulesContent.includes('[submodule "packages/mobile-sdk-alpha/mobile-sdk-native"]');

    if (process.env.DEBUG_SETUP === 'true') {
      log(`Environment: CI=${isCI}, hasAppToken=${!!appToken}, hasRepoToken=${!!repoToken}`, 'info');
      log(`Submodule registered: ${isSubmoduleRegistered}`, 'info');
    }

    // Check if submodule directory exists and has content
    const submoduleExists = fs.existsSync(PRIVATE_MODULE_PATH);
    let submoduleHasContent = false;
    try {
      submoduleHasContent = submoduleExists && fs.readdirSync(PRIVATE_MODULE_PATH).length > 0;
    } catch {
      // Directory might not be readable, treat as empty
      submoduleHasContent = false;
    }

    log(`Submodule directory exists: ${submoduleExists}, has content: ${submoduleHasContent}`, 'info');

    // If submodule is registered, update its URL first (important for CI where we switch from SSH to HTTPS)
    if (isSubmoduleRegistered) {
      log(`Submodule is registered, updating URL from SSH to HTTPS...`, 'info');
      log(`Target URL: ${submoduleUrl}`, 'info');

      // Update submodule URL using git submodule set-url (Git 2.25+)
      try {
        const setUrlResult = runCommand(
          `git submodule set-url packages/mobile-sdk-alpha/mobile-sdk-native "${submoduleUrl}"`,
          { stdio: 'pipe' },
          REPO_ROOT,
        );
        log('Updated submodule URL using git submodule set-url', 'success');
        log(`Command result: ${setUrlResult}`, 'info');
      } catch (error) {
        log(`git submodule set-url failed: ${error.message}`, 'warning');
        // Fallback: Update .gitmodules file directly
        try {
          let gitmodulesContent = fs.readFileSync(gitmodulesPath, 'utf8');
          log(`Current .gitmodules content:\n${gitmodulesContent}`, 'info');
          // Replace the URL for mobile-sdk-native submodule
          const oldContent = gitmodulesContent;
          gitmodulesContent = gitmodulesContent.replace(
            /(\[submodule\s+"packages\/mobile-sdk-alpha\/mobile-sdk-native"\]\s+path\s*=\s*packages\/mobile-sdk-alpha\/mobile-sdk-native\s+url\s*=\s*)[^\s]+/,
            `$1${submoduleUrl}`,
          );
          if (oldContent !== gitmodulesContent) {
            fs.writeFileSync(gitmodulesPath, gitmodulesContent, 'utf8');
            log('Updated .gitmodules with new submodule URL', 'success');
            log(`New .gitmodules content:\n${gitmodulesContent}`, 'info');
          } else {
            log('No changes made to .gitmodules - regex may not match', 'warning');
          }
        } catch (fallbackError) {
          log(`Could not update .gitmodules: ${fallbackError.message}`, 'error');
        }
      }
    }

    // If directory exists but is empty, remove it so we can re-initialize
    if (submoduleExists && !submoduleHasContent) {
      log('Submodule directory exists but is empty, removing...', 'info');
      runCommand(`rm -rf "${path.relative(REPO_ROOT, PRIVATE_MODULE_PATH)}"`, { stdio: 'pipe' }, REPO_ROOT);
    }

    if (isSubmoduleRegistered) {
      // Submodule is registered, update/init it
      log('Updating and initializing submodule...', 'info');
      try {
        const updateResult = runCommand(
          `git submodule update --init --recursive packages/mobile-sdk-alpha/mobile-sdk-native`,
          {},
          REPO_ROOT,
        );
        log(`Submodule update completed: ${updateResult}`, 'success');
      } catch (error) {
        log(`Submodule update failed: ${error.message}`, 'error');
        throw error;
      }
    } else {
      // Submodule not registered, add it
      log('Adding submodule...', 'info');
      const addCommand = `git submodule add -b ${BRANCH} "${submoduleUrl}" packages/mobile-sdk-alpha/mobile-sdk-native`;
      if (isCI && (appToken || repoToken)) {
        // Security: Run command silently to avoid token exposure in logs
        runCommand(addCommand, { stdio: 'pipe' }, REPO_ROOT);
      } else {
        runCommand(addCommand, {}, REPO_ROOT);
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
