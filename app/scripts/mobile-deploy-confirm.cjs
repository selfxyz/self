// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { readFileSync } = require('fs');
const { join } = require('path');
let { execSync } = require('child_process');

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
  VERSION_JSON: '../version.json',
  IOS_INFO_PLIST: '../ios/OpenPassport/Info.plist',
  IOS_PROJECT_PBXPROJ: '../ios/Self.xcodeproj/project.pbxproj',
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
  IOS_BUILD: /CURRENT_PROJECT_VERSION = (\d+);/,
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
    return readFileSync(filePath, 'utf8');
  } catch {
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
  // Whitelist of allowed commands to prevent command injection
  const allowedCommands = [
    'git branch --show-current',
    'git status --porcelain',
  ];

  // Validate that the command is in the whitelist
  if (!allowedCommands.includes(command)) {
    console.warn(
      `Warning: Command '${command}' is not allowed for security reasons`,
    );
    return null;
  }

  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch {
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
  console.error(
    '  IOS_PROJECT_PBXPROJ_PATH      Override iOS project.pbxproj path',
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
  const packageJsonPath = join(__dirname, FILE_PATHS.PACKAGE_JSON);
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version || 'Unknown';
  } catch (error) {
    console.warn(`Warning: Could not parse package.json: ${error.message}`);
    return 'Unknown';
  }
}

/**
 * Reads iOS version information from Info.plist and project.pbxproj
 * @returns {Object} iOS version information
 */
function getIOSVersion() {
  const infoPlistPath = join(__dirname, FILE_PATHS.IOS_INFO_PLIST);
  const infoPlist = safeReadFile(infoPlistPath, 'iOS Info.plist');

  if (!infoPlist) {
    return { version: 'Unknown', build: 'Unknown' };
  }

  const iosVersionMatch = infoPlist.match(REGEX_PATTERNS.IOS_VERSION);
  const version = iosVersionMatch ? iosVersionMatch[1] : 'Unknown';

  // Extract build number from project.pbxproj
  // Allow iOS project path to be overridden by environment variable
  const iosProjectPath =
    process.env.IOS_PROJECT_PBXPROJ_PATH || FILE_PATHS.IOS_PROJECT_PBXPROJ;
  const projectPath = join(__dirname, iosProjectPath);
  const projectFile = safeReadFile(projectPath, 'iOS project.pbxproj');

  let build = 'Unknown';
  if (projectFile) {
    const buildMatch = projectFile.match(REGEX_PATTERNS.IOS_BUILD);
    build = buildMatch ? buildMatch[1] : 'Unknown';
  }

  return { version, build };
}

/**
 * Reads Android version information from build.gradle
 * @returns {Object} Android version information
 */
function getAndroidVersion() {
  const buildGradlePath = join(__dirname, FILE_PATHS.ANDROID_BUILD_GRADLE);
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
 * Reads version.json for build numbers and deployment history
 * @returns {Object|null} Version data or null if not found
 */
function getVersionJsonData() {
  const versionJsonPath = join(__dirname, FILE_PATHS.VERSION_JSON);
  try {
    const versionData = JSON.parse(readFileSync(versionJsonPath, 'utf8'));
    return versionData;
  } catch (error) {
    console.warn(`Warning: Could not read version.json: ${error.message}`);
    return null;
  }
}

/**
 * Formats time elapsed since last deployment
 * @param {string} timestamp - ISO timestamp of last deployment
 * @returns {string} Human-readable time elapsed
 */
function getTimeAgo(timestamp) {
  if (!timestamp) return 'Never deployed';

  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else {
    return 'Less than an hour ago';
  }
}

/**
 * Reads version information from package.json, iOS Info.plist, and Android build.gradle
 * @returns {Object} Object containing version information for all platforms
 */
function getCurrentVersions() {
  const versionJson = getVersionJsonData();

  return {
    main: getMainVersion(),
    ios: getIOSVersion(),
    android: getAndroidVersion(),
    versionJson: versionJson,
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

// Display Functions

/**
 * Displays the header and platform information
 * @param {string} platform - Target platform
 */
function displayDeploymentHeader(platform) {
  console.log(`\n${CONSOLE_SYMBOLS.MOBILE} Mobile App Deployment Confirmation`);
  console.log('=====================================');
  console.log(`${CONSOLE_SYMBOLS.ROCKET} Platform: ${platform.toUpperCase()}`);
}

/**
 * Displays deployment method information
 * @param {string} deploymentMethod - The deployment method to use
 */
function displayDeploymentMethod(deploymentMethod) {
  if (deploymentMethod === DEPLOYMENT_METHODS.LOCAL_FASTLANE) {
    console.log(
      `${CONSOLE_SYMBOLS.LOCATION} Deployment: Local fastlane upload`,
    );
  } else {
    console.log(`${CONSOLE_SYMBOLS.CLOUD} Deployment: GitHub Actions workflow`);
  }
}

/**
 * Displays platform-specific version information
 * @param {string} platform - Target platform
 * @param {Object} versions - Version information object
 */
function displayPlatformVersions(platform, versions) {
  console.log(`${CONSOLE_SYMBOLS.PACKAGE} Main Version: ${versions.main}`);

  if (platform === PLATFORMS.IOS || platform === PLATFORMS.BOTH) {
    const currentBuild = versions.ios.build;
    const nextBuild = versions.versionJson
      ? versions.versionJson.ios.build + 1
      : parseInt(currentBuild, 10) + 1;
    const lastDeployed = versions.versionJson
      ? getTimeAgo(versions.versionJson.ios.lastDeployed)
      : 'Unknown';

    console.log(
      `${CONSOLE_SYMBOLS.APPLE} iOS Version: ${versions.ios.version}`,
    );
    console.log(
      `${CONSOLE_SYMBOLS.APPLE} iOS Build: ${currentBuild} → ${nextBuild}`,
    );
    console.log(`${CONSOLE_SYMBOLS.APPLE} Last iOS Deploy: ${lastDeployed}`);
  }

  if (platform === PLATFORMS.ANDROID || platform === PLATFORMS.BOTH) {
    const currentBuild = versions.android.versionCode;
    const nextBuild = versions.versionJson
      ? versions.versionJson.android.build + 1
      : parseInt(currentBuild, 10) + 1;
    const lastDeployed = versions.versionJson
      ? getTimeAgo(versions.versionJson.android.lastDeployed)
      : 'Unknown';

    console.log(
      `${CONSOLE_SYMBOLS.ANDROID} Android Version: ${versions.android.version}`,
    );
    console.log(
      `${CONSOLE_SYMBOLS.ANDROID} Android Version Code: ${currentBuild} → ${nextBuild}`,
    );
    console.log(
      `${CONSOLE_SYMBOLS.ANDROID} Last Android Deploy: ${lastDeployed}`,
    );
  }

  // Check for potential issues
  if (versions.versionJson) {
    if (platform === PLATFORMS.IOS || platform === PLATFORMS.BOTH) {
      const jsonBuild = versions.versionJson.ios.build;
      const actualBuild = parseInt(versions.ios.build, 10);
      if (jsonBuild !== actualBuild) {
        console.log(
          `\n${CONSOLE_SYMBOLS.WARNING} iOS build mismatch: version.json has ${jsonBuild}, but Xcode has ${actualBuild}`,
        );
      }
    }

    if (platform === PLATFORMS.ANDROID || platform === PLATFORMS.BOTH) {
      const jsonBuild = versions.versionJson.android.build;
      const actualBuild = parseInt(versions.android.versionCode, 10);
      if (jsonBuild !== actualBuild) {
        console.log(
          `\n${CONSOLE_SYMBOLS.WARNING} Android build mismatch: version.json has ${jsonBuild}, but gradle has ${actualBuild}`,
        );
      }
    }
  }
}

/**
 * Displays warnings and git status information
 */
function displayWarningsAndGitStatus() {
  const currentBranch = getCurrentBranch();
  const hasUncommitted = hasUncommittedChanges();

  console.log(`\n${CONSOLE_SYMBOLS.WARNING} Important Notes:`);
  console.log(
    '• Deploys to internal testing (TestFlight/Google Play Internal)',
  );
  if (currentBranch) {
    console.log(`• Current branch: ${currentBranch}`);
  }
  if (hasUncommitted) {
    console.log('• You have uncommitted changes - consider committing first');
  }
}

/**
 * Displays all confirmation information
 * @param {string} platform - Target platform
 * @param {Object} versions - Version information object
 * @param {string} deploymentMethod - The deployment method to use
 */
function displayFullConfirmation(platform, versions, deploymentMethod) {
  displayDeploymentHeader(platform);
  displayDeploymentMethod(deploymentMethod);
  if (
    deploymentMethod === DEPLOYMENT_METHODS.LOCAL_FASTLANE &&
    (platform === PLATFORMS.ANDROID || platform === PLATFORMS.BOTH)
  ) {
    console.log(
      `${CONSOLE_SYMBOLS.WARNING} Local Android uploads are disabled. You'll need to manually upload the AAB in Play Console.`,
    );
  }
  displayPlatformVersions(platform, versions);
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
      // Trim whitespace and normalize to lowercase for robust comparison
      const normalizedAnswer = answer.trim().toLowerCase();
      resolve(normalizedAnswer === 'y' || normalizedAnswer === 'yes');
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
    cwd: join(__dirname, '..'),
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
 * Executes iOS build cleanup script
 * @param {string} platform - Target platform
 */
let performIOSBuildCleanup = function (platform) {
  // Only run cleanup for iOS deployments
  if (platform !== PLATFORMS.IOS && platform !== PLATFORMS.BOTH) {
    return;
  }

  console.log(`\n${CONSOLE_SYMBOLS.BROOM} Cleaning up iOS build artifacts...`);

  try {
    const cleanupScript = join(__dirname, 'cleanup-ios-build.sh');
    execSync(`bash "${cleanupScript}"`, {
      stdio: 'inherit',
      cwd: __dirname,
    });
    console.log(
      `${CONSOLE_SYMBOLS.SUCCESS} iOS build cleanup completed successfully!`,
    );
  } catch (error) {
    console.error(
      `${CONSOLE_SYMBOLS.WARNING} iOS build cleanup failed (non-fatal):`,
      error.message,
    );
    // Don't exit on cleanup failure - it's not critical
  }
};

/**
 * Executes local fastlane deployment
 * @param {string} platform - Target platform
 */
async function executeLocalFastlaneDeployment(platform) {
  console.log(
    `\n${CONSOLE_SYMBOLS.ROCKET} Starting local fastlane deployment...`,
  );

  let deploymentSuccessful = false;

  try {
    performYarnReinstall();

    const commands = getFastlaneCommands(platform);

    // Create environment with FORCE_UPLOAD_LOCAL_DEV set for child processes
    const envWithForceUpload = {
      ...process.env,
      FORCE_UPLOAD_LOCAL_DEV: 'true',
    };

    for (const command of commands) {
      console.log(`\n${CONSOLE_SYMBOLS.REPEAT} Running: ${command}`);
      execSync(command, {
        stdio: 'inherit',
        cwd: __dirname,
        env: envWithForceUpload,
      });
    }

    deploymentSuccessful = true;
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
  } finally {
    // Always run cleanup after deployment, regardless of success/failure
    performIOSBuildCleanup(platform);

    // Only exit with error code if deployment failed
    if (!deploymentSuccessful) {
      process.exit(1);
    }
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

  // Safely get the current branch name to avoid command injection
  const currentBranch = getCurrentBranch();
  if (!currentBranch) {
    console.error(
      `${CONSOLE_SYMBOLS.ERROR} Could not determine current git branch`,
    );
    process.exit(1);
  }

  const command = `gh workflow run mobile-deploy.yml --ref ${currentBranch} -f platform=${platform}`;

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
if (require.main === module) {
  main().catch(error => {
    console.error(`${CONSOLE_SYMBOLS.ERROR} Error:`, error.message);
    process.exit(1);
  });
} else {
  module.exports = {
    performIOSBuildCleanup,
    executeLocalFastlaneDeployment,
    _setExecSync: fn => {
      execSync = fn;
    },
    _setPerformIOSBuildCleanup: fn => {
      performIOSBuildCleanup = fn;
    },
  };
}
