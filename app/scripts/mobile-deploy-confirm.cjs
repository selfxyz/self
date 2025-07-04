// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Constants
const DEPLOYMENT_METHODS = {
  GITHUB_RUNNER: 'github-runner',
  LOCAL_FASTLANE: 'local-fastlane',
};

const PLATFORMS = {
  IOS: 'ios',
  ANDROID: 'android',
  BOTH: 'both',
};

const SUPPORTED_PLATFORMS = Object.values(PLATFORMS);

const FILE_PATHS = {
  PACKAGE_JSON: '../package.json',
  IOS_INFO_PLIST: '../ios/OpenPassport/Info.plist',
  ANDROID_BUILD_GRADLE: '../android/app/build.gradle',
};

const CONSOLE_SYMBOLS = {
  MOBILE: '📱',
  PACKAGE: '📦',
  ROCKET: '🚀',
  WARNING: '⚠️',
  SUCCESS: '✅',
  ERROR: '❌',
  APPLE: '🍎',
  ANDROID: '🤖',
  CLOUD: '☁️',
  LOCATION: '📍',
  MEMO: '📝',
  CHART: '📊',
  BROOM: '🧹',
  REPEAT: '🔄',
};

const REGEX_PATTERNS = {
  IOS_VERSION:
    /<key>CFBundleShortVersionString<\/key>\s*<string>(.*?)<\/string>/,
  ANDROID_VERSION: /versionName\s+"(.+?)"/,
  ANDROID_VERSION_CODE: /versionCode\s+(\d+)/,
};

// Utility Functions

/**
 * Safely reads a file and returns its content or null if failed
 * @param {string} filePath - Path to the file to read
 * @param {string} description - Description of the file for error messages
 * @returns {string|null} File content or null if failed
 */
function safeReadFile(filePath, description) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.warn(`Warning: Could not read ${description} at ${filePath}`);
    return null;
  }
}

/**
 * Safely executes a command and returns its output
 * @param {string} command - Command to execute
 * @param {string} description - Description for error messages
 * @returns {string|null} Command output or null if failed
 */
function safeExecSync(command, description) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch (error) {
    console.warn(`Warning: Could not ${description}`);
    return null;
  }
}

/**
 * Validates the provided platform argument
 * @param {string} platform - Platform argument to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validatePlatform(platform) {
  return platform && SUPPORTED_PLATFORMS.includes(platform);
}

/**
 * Displays usage information and exits
 */
function displayUsageAndExit() {
  console.error('Usage: node mobile-deploy-confirm.cjs <ios|android|both>');
  console.error('');
  console.error('Recommended: Use yarn commands instead:');
  console.error(
    '  yarn mobile-deploy              # Deploy to both platforms (GitHub runner)',
  );
  console.error(
    '  yarn mobile-deploy:ios          # Deploy to iOS only (GitHub runner)',
  );
  console.error(
    '  yarn mobile-deploy:android      # Deploy to Android only (GitHub runner)',
  );
  console.error(
    '  yarn mobile-local-deploy        # Deploy to both platforms (local fastlane)',
  );
  console.error(
    '  yarn mobile-local-deploy:ios    # Deploy to iOS only (local fastlane)',
  );
  console.error(
    '  yarn mobile-local-deploy:android # Deploy to Android only (local fastlane)',
  );
  console.error('');
  console.error('Direct script usage:');
  console.error('  node mobile-deploy-confirm.cjs ios');
  console.error('  node mobile-deploy-confirm.cjs android');
  console.error('  node mobile-deploy-confirm.cjs both');
  console.error('');
  console.error('Environment Variables:');
  console.error(
    '  FORCE_UPLOAD_LOCAL_DEV=true   Use local fastlane instead of GitHub runner',
  );
  process.exit(1);
}

// Core Functions

/**
 * Determines the deployment method based on environment variables
 * @returns {'github-runner' | 'local-fastlane'} The deployment method to use
 */
function getDeploymentMethod() {
  // Check if running in GitHub Actions
  if (process.env.GITHUB_ACTIONS === 'true') {
    return DEPLOYMENT_METHODS.GITHUB_RUNNER;
  }

  // Check if force upload is explicitly set for local development
  if (process.env.FORCE_UPLOAD_LOCAL_DEV === 'true') {
    return DEPLOYMENT_METHODS.LOCAL_FASTLANE;
  }

  // Default to GitHub runner (safer default)
  // Users must explicitly set FORCE_UPLOAD_LOCAL_DEV=true to use local fastlane
  return DEPLOYMENT_METHODS.GITHUB_RUNNER;
}

/**
 * Reads the main version from package.json
 * @returns {string} The main version number
 */
function getMainVersion() {
  const packageJsonPath = path.join(__dirname, FILE_PATHS.PACKAGE_JSON);
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return packageJson.version;
}

/**
 * Reads iOS version information from Info.plist
 * @returns {Object} iOS version information
 */
function getIOSVersion() {
  const infoPlistPath = path.join(__dirname, FILE_PATHS.IOS_INFO_PLIST);
  const infoPlist = safeReadFile(infoPlistPath, 'iOS Info.plist');

  if (!infoPlist) {
    return { version: 'Unknown' };
  }

  const iosVersionMatch = infoPlist.match(REGEX_PATTERNS.IOS_VERSION);
  return {
    version: iosVersionMatch ? iosVersionMatch[1] : 'Unknown',
  };
}

/**
 * Reads Android version information from build.gradle
 * @returns {Object} Android version information
 */
function getAndroidVersion() {
  const buildGradlePath = path.join(__dirname, FILE_PATHS.ANDROID_BUILD_GRADLE);
  const buildGradle = safeReadFile(buildGradlePath, 'Android build.gradle');

  if (!buildGradle) {
    return { version: 'Unknown', versionCode: 'Unknown' };
  }

  const androidVersionMatch = buildGradle.match(REGEX_PATTERNS.ANDROID_VERSION);
  const androidVersionCodeMatch = buildGradle.match(
    REGEX_PATTERNS.ANDROID_VERSION_CODE,
  );

  return {
    version: androidVersionMatch ? androidVersionMatch[1] : 'Unknown',
    versionCode: androidVersionCodeMatch
      ? androidVersionCodeMatch[1]
      : 'Unknown',
  };
}

/**
 * Reads version information from package.json, iOS Info.plist, and Android build.gradle
 * @returns {Object} Object containing version information for all platforms
 */
function getCurrentVersions() {
  return {
    main: getMainVersion(),
    ios: getIOSVersion(),
    android: getAndroidVersion(),
  };
}

// Git Operations

/**
 * Gets the current git branch name
 * @returns {string|null} Current branch name or null if failed
 */
function getCurrentBranch() {
  return safeExecSync(
    'git branch --show-current',
    'determine current git branch',
  );
}

/**
 * Checks if there are uncommitted changes
 * @returns {boolean} True if there are uncommitted changes
 */
function hasUncommittedChanges() {
  const gitStatus = safeExecSync('git status --porcelain', 'check git status');
  return gitStatus && gitStatus.trim().length > 0;
}

/**
 * Displays git status information
 */
function displayGitStatus() {
  const currentBranch = getCurrentBranch();
  if (currentBranch) {
    console.log(`${CONSOLE_SYMBOLS.MEMO} Current branch: ${currentBranch}`);
  }

  if (hasUncommittedChanges()) {
    console.log(
      `${CONSOLE_SYMBOLS.WARNING} WARNING: You have uncommitted changes!`,
    );
    console.log('   Consider committing your changes before deployment.');
  }
}

// Display Functions

/**
 * Displays the header and platform information
 * @param {string} platform - Target platform
 * @param {Object} versions - Version information object
 */
function displayDeploymentHeader(platform, versions) {
  console.log(`\n${CONSOLE_SYMBOLS.MOBILE} Mobile App Deployment Confirmation`);
  console.log('=====================================');
  console.log(`Platform: ${platform.toUpperCase()}`);
  console.log(`Main Version: ${versions.main}`);
}

/**
 * Displays platform-specific version information
 * @param {string} platform - Target platform
 * @param {Object} versions - Version information object
 */
function displayPlatformVersions(platform, versions) {
  if (platform === PLATFORMS.IOS || platform === PLATFORMS.BOTH) {
    console.log(`iOS Version: ${versions.ios.version}`);
    console.log(
      'iOS Build: Current build number will be used (manually increment if needed)',
    );
  }

  if (platform === PLATFORMS.ANDROID || platform === PLATFORMS.BOTH) {
    console.log(`Android Version: ${versions.android.version}`);
    console.log(
      `Android Version Code: ${versions.android.versionCode} (current - manually increment if needed)`,
    );
  }
}

/**
 * Displays deployment destination information
 * @param {string} platform - Target platform
 */
function displayDeploymentDestination(platform) {
  console.log(`\n${CONSOLE_SYMBOLS.PACKAGE} Deployment Destination:`);
  if (platform === PLATFORMS.IOS || platform === PLATFORMS.BOTH) {
    console.log(`   ${CONSOLE_SYMBOLS.APPLE} iOS: TestFlight Internal Testing`);
  }
  if (platform === PLATFORMS.ANDROID || platform === PLATFORMS.BOTH) {
    console.log(
      `   ${CONSOLE_SYMBOLS.ANDROID} Android: Google Play Internal Testing`,
    );
  }
}

/**
 * Displays local fastlane deployment information
 */
function displayLocalFastlaneInfo() {
  console.log(`   ${CONSOLE_SYMBOLS.LOCATION} LOCAL FASTLANE UPLOAD`);
  console.log(
    `   ${CONSOLE_SYMBOLS.WARNING} This will upload directly from your machine using fastlane`,
  );
  console.log(`   ${CONSOLE_SYMBOLS.WARNING} Make sure you have:`);
  console.log('      - Valid certificates and provisioning profiles');
  console.log('      - App Store Connect API key configured');
  console.log('      - Google Play Store service account key (for Android)');
  console.log('      - Set FORCE_UPLOAD_LOCAL_DEV=true in your environment');
}

/**
 * Displays GitHub runner deployment information
 */
function displayGithubRunnerInfo() {
  console.log(`   ${CONSOLE_SYMBOLS.CLOUD} GITHUB RUNNER DEPLOYMENT`);
  console.log(
    `   ${CONSOLE_SYMBOLS.WARNING} This will trigger a GitHub Actions workflow`,
  );
  console.log(
    `   ${CONSOLE_SYMBOLS.WARNING} The build will be created and uploaded by GitHub runners`,
  );
  console.log(
    `   ${CONSOLE_SYMBOLS.WARNING} Make sure repository secrets are configured`,
  );
}

/**
 * Displays deployment method information
 * @param {string} deploymentMethod - The deployment method to use
 */
function displayDeploymentMethod(deploymentMethod) {
  console.log(`\n${CONSOLE_SYMBOLS.ROCKET} Deployment Method:`);

  if (deploymentMethod === DEPLOYMENT_METHODS.LOCAL_FASTLANE) {
    displayLocalFastlaneInfo();
  } else {
    displayGithubRunnerInfo();
  }
}

/**
 * Displays warnings and git status information
 */
function displayWarningsAndGitStatus() {
  console.log(
    `\n${CONSOLE_SYMBOLS.WARNING} This will deploy to INTERNAL TESTING stores!`,
  );
  console.log(
    `${CONSOLE_SYMBOLS.WARNING} (TestFlight Internal Testing / Google Play Internal Testing)`,
  );
  console.log(
    `${CONSOLE_SYMBOLS.WARNING} Make sure you have committed all your changes.`,
  );

  displayGitStatus();
}

/**
 * Displays all confirmation information
 * @param {string} platform - Target platform
 * @param {Object} versions - Version information object
 * @param {string} deploymentMethod - The deployment method to use
 */
function displayFullConfirmation(platform, versions, deploymentMethod) {
  displayDeploymentHeader(platform, versions);
  displayPlatformVersions(platform, versions);
  displayDeploymentDestination(platform);
  displayDeploymentMethod(deploymentMethod);
  displayWarningsAndGitStatus();
}

/**
 * Prompts the user for confirmation
 * @returns {Promise<boolean>} True if user confirms, false otherwise
 */
function promptConfirmation() {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    readline.question('\nDo you want to proceed? (y/N): ', answer => {
      readline.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Deployment Functions

/**
 * Performs yarn reinstall to ensure clean dependencies
 */
function performYarnReinstall() {
  console.log(
    `\n${CONSOLE_SYMBOLS.BROOM} Performing yarn reinstall to ensure clean dependencies...`,
  );
  execSync('yarn reinstall', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });
  console.log(
    `${CONSOLE_SYMBOLS.SUCCESS} Yarn reinstall completed successfully!`,
  );
}

/**
 * Gets the fastlane commands for the specified platform
 * @param {string} platform - Target platform
 * @returns {string[]} Array of fastlane commands to execute
 */
function getFastlaneCommands(platform) {
  const commands = [];

  if (platform === PLATFORMS.IOS || platform === PLATFORMS.BOTH) {
    commands.push('cd .. && bundle exec fastlane ios internal_test');
  }

  if (platform === PLATFORMS.ANDROID || platform === PLATFORMS.BOTH) {
    commands.push('cd .. && bundle exec fastlane android internal_test');
  }

  return commands;
}

/**
 * Executes local fastlane deployment
 * @param {string} platform - Target platform
 */
async function executeLocalFastlaneDeployment(platform) {
  console.log(
    `\n${CONSOLE_SYMBOLS.ROCKET} Starting local fastlane deployment...`,
  );

  // Set the environment variable to allow local upload
  process.env.FORCE_UPLOAD_LOCAL_DEV = 'true';

  try {
    performYarnReinstall();

    const commands = getFastlaneCommands(platform);

    for (const command of commands) {
      console.log(`\n${CONSOLE_SYMBOLS.REPEAT} Running: ${command}`);
      execSync(command, { stdio: 'inherit', cwd: __dirname });
    }

    console.log(
      `${CONSOLE_SYMBOLS.SUCCESS} Local fastlane deployment completed successfully!`,
    );
    console.log(
      `${CONSOLE_SYMBOLS.MOBILE} Check your app store dashboards for the new builds.`,
    );
  } catch (error) {
    console.error(
      `${CONSOLE_SYMBOLS.ERROR} Local fastlane deployment failed:`,
      error.message,
    );
    process.exit(1);
  }
}

/**
 * Executes GitHub runner deployment
 * @param {string} platform - Target platform
 */
async function executeGithubRunnerDeployment(platform) {
  console.log(
    `\n${CONSOLE_SYMBOLS.ROCKET} Starting GitHub runner deployment...`,
  );
  const command = `gh workflow run mobile-deploy.yml --ref $(git branch --show-current) -f platform=${platform}`;

  try {
    execSync(command, { stdio: 'inherit' });
    console.log(
      `${CONSOLE_SYMBOLS.SUCCESS} GitHub workflow triggered successfully!`,
    );
    console.log(
      `${CONSOLE_SYMBOLS.CHART} Check GitHub Actions for build progress.`,
    );
  } catch (error) {
    console.error(
      `${CONSOLE_SYMBOLS.ERROR} Failed to trigger GitHub workflow:`,
      error.message,
    );
    process.exit(1);
  }
}

/**
 * Executes the deployment based on the specified method
 * @param {string} platform - Target platform
 * @param {string} deploymentMethod - The deployment method to use
 */
async function executeDeployment(platform, deploymentMethod) {
  if (deploymentMethod === DEPLOYMENT_METHODS.LOCAL_FASTLANE) {
    await executeLocalFastlaneDeployment(platform);
  } else {
    await executeGithubRunnerDeployment(platform);
  }
}

// Main Function

/**
 * Main function that orchestrates the deployment confirmation process
 */
async function main() {
  const platform = process.argv[2];

  if (!validatePlatform(platform)) {
    displayUsageAndExit();
  }

  const deploymentMethod = getDeploymentMethod();
  const versions = getCurrentVersions();

  displayFullConfirmation(platform, versions, deploymentMethod);

  const confirmed = await promptConfirmation();

  if (confirmed) {
    await executeDeployment(platform, deploymentMethod);
  } else {
    console.log(`\n${CONSOLE_SYMBOLS.ERROR} Deployment cancelled.`);
    process.exit(0);
  }
}

// Execute main function
main().catch(error => {
  console.error(`${CONSOLE_SYMBOLS.ERROR} Error:`, error.message);
  process.exit(1);
});
