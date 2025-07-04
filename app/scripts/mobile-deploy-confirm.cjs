// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Detect deployment method
function getDeploymentMethod() {
  // Check if running in GitHub Actions
  if (process.env.GITHUB_ACTIONS === 'true') {
    return 'github-runner';
  }

  // Check if force upload is explicitly set for local development
  if (process.env.FORCE_UPLOAD_LOCAL_DEV === 'true') {
    return 'local-fastlane';
  }

  // Default to GitHub runner (safer default)
  // Users must explicitly set FORCE_UPLOAD_LOCAL_DEV=true to use local fastlane
  return 'github-runner';
}

// Read current versions from various files
function getCurrentVersions() {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'),
  );
  const version = packageJson.version;

  // Read iOS build number from Info.plist
  const infoPlistPath = path.join(__dirname, '../ios/OpenPassport/Info.plist');
  let iosVersion = 'Unknown';

  try {
    const infoPlist = fs.readFileSync(infoPlistPath, 'utf8');
    const iosVersionMatch = infoPlist.match(
      new RegExp(
        '<key>CFBundleShortVersionString</key>\\s*<string>(.*?)</string>',
      ),
    );
    iosVersion = iosVersionMatch ? iosVersionMatch[1] : 'Unknown';
  } catch (error) {
    console.warn('Warning: Could not read iOS Info.plist');
  }

  // Read Android version from build.gradle
  const buildGradlePath = path.join(__dirname, '../android/app/build.gradle');
  let androidVersion = 'Unknown';
  let androidVersionCode = 'Unknown';

  try {
    const buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
    const androidVersionMatch = buildGradle.match(/versionName\s+"(.+?)"/);
    const androidVersionCodeMatch = buildGradle.match(/versionCode\s+(\d+)/);
    androidVersion = androidVersionMatch ? androidVersionMatch[1] : 'Unknown';
    androidVersionCode = androidVersionCodeMatch
      ? androidVersionCodeMatch[1]
      : 'Unknown';
  } catch (error) {
    console.warn('Warning: Could not read Android build.gradle');
  }

  return {
    main: version,
    ios: { version: iosVersion },
    android: { version: androidVersion, versionCode: androidVersionCode },
  };
}

function displayVersionInfo(platform, versions, deploymentMethod) {
  console.log('\n📱 Mobile App Deployment Confirmation');
  console.log('=====================================');
  console.log(`Platform: ${platform.toUpperCase()}`);
  console.log(`Main Version: ${versions.main}`);

  if (platform === 'ios' || platform === 'both') {
    console.log(`iOS Version: ${versions.ios.version}`);
    console.log(
      `iOS Build: Current build number will be used (manually increment if needed)`,
    );
  }

  if (platform === 'android' || platform === 'both') {
    console.log(`Android Version: ${versions.android.version}`);
    console.log(
      `Android Version Code: ${versions.android.versionCode} (current - manually increment if needed)`,
    );
  }

  // Display deployment destination
  console.log('\n📦 Deployment Destination:');
  if (platform === 'ios' || platform === 'both') {
    console.log('   🍎 iOS: TestFlight Internal Testing');
  }
  if (platform === 'android' || platform === 'both') {
    console.log('   🤖 Android: Google Play Internal Testing');
  }

  // Display deployment method info
  console.log('\n🚀 Deployment Method:');
  if (deploymentMethod === 'local-fastlane') {
    console.log('   📍 LOCAL FASTLANE UPLOAD');
    console.log(
      '   ⚠️  This will upload directly from your machine using fastlane',
    );
    console.log('   ⚠️  Make sure you have:');
    console.log('      - Valid certificates and provisioning profiles');
    console.log('      - App Store Connect API key configured');
    console.log('      - Google Play Store service account key (for Android)');
    console.log('      - Set FORCE_UPLOAD_LOCAL_DEV=true in your environment');
  } else {
    console.log('   ☁️  GITHUB RUNNER DEPLOYMENT');
    console.log('   ⚠️  This will trigger a GitHub Actions workflow');
    console.log(
      '   ⚠️  The build will be created and uploaded by GitHub runners',
    );
    console.log('   ⚠️  Make sure repository secrets are configured');
  }

  console.log('\n⚠️  This will deploy to INTERNAL TESTING stores!');
  console.log(
    '⚠️  (TestFlight Internal Testing / Google Play Internal Testing)',
  );
  console.log('⚠️  Make sure you have committed all your changes.');

  // Show current git branch and status
  try {
    const currentBranch = execSync('git branch --show-current', {
      encoding: 'utf8',
    }).trim();
    console.log(`📝 Current branch: ${currentBranch}`);

    // Check if there are uncommitted changes
    try {
      const gitStatus = execSync('git status --porcelain', {
        encoding: 'utf8',
      }).trim();

      if (gitStatus) {
        console.log('⚠️  WARNING: You have uncommitted changes!');
        console.log('   Consider committing your changes before deployment.');
      }
    } catch (error) {
      // Git status check failed, continue anyway
    }
  } catch (error) {
    console.warn('Warning: Could not determine current git branch');
  }
}

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

async function executeDeployment(platform, deploymentMethod) {
  if (deploymentMethod === 'local-fastlane') {
    console.log('\n🚀 Starting local fastlane deployment...');

    // Set the environment variable to allow local upload
    process.env.FORCE_UPLOAD_LOCAL_DEV = 'true';

    try {
      const commands = [];

      if (platform === 'ios' || platform === 'both') {
        commands.push('cd .. && bundle exec fastlane ios internal_test');
      }

      if (platform === 'android' || platform === 'both') {
        commands.push('cd .. && bundle exec fastlane android internal_test');
      }

      for (const command of commands) {
        console.log(`\n🔄 Running: ${command}`);
        execSync(command, { stdio: 'inherit', cwd: __dirname });
      }

      console.log('✅ Local fastlane deployment completed successfully!');
      console.log('📱 Check your app store dashboards for the new builds.');
    } catch (error) {
      console.error('❌ Local fastlane deployment failed:', error.message);
      process.exit(1);
    }
  } else {
    console.log('\n🚀 Starting GitHub runner deployment...');
    const command = `gh workflow run mobile-deploy.yml --ref $(git branch --show-current) -f platform=${platform}`;

    try {
      execSync(command, { stdio: 'inherit' });
      console.log('✅ GitHub workflow triggered successfully!');
      console.log('📊 Check GitHub Actions for build progress.');
    } catch (error) {
      console.error('❌ Failed to trigger GitHub workflow:', error.message);
      process.exit(1);
    }
  }
}

async function main() {
  const platform = process.argv[2];
  if (!platform || !['ios', 'android', 'both'].includes(platform)) {
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

  const deploymentMethod = getDeploymentMethod();
  const versions = getCurrentVersions();

  displayVersionInfo(platform, versions, deploymentMethod);

  const confirmed = await promptConfirmation();

  if (confirmed) {
    await executeDeployment(platform, deploymentMethod);
  } else {
    console.log('\n❌ Deployment cancelled.');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
