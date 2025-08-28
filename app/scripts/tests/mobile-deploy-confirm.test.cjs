// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const { existsSync, readFileSync } = require('fs');
const { join } = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert');

const MOCK_IOS_INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleShortVersionString</key>
  <string>1.2.3</string>
  <key>CFBundleVersion</key>
  <string>$(CURRENT_PROJECT_VERSION)</string>
</dict>
</plist>`;

const MOCK_IOS_PROJECT_FILE = `// !$*UTF8*$!
{
  archiveVersion = 1;
  classes = {
  };
  objectVersion = 54;
  objects = {
    buildSettings = {
      CURRENT_PROJECT_VERSION = 456;
      MARKETING_VERSION = 1.2.3;
    };
  };
  rootObject = 13B07F961A680F5B00A75B9A;
}`;

const MOCK_ANDROID_BUILD_GRADLE = `android {
    compileSdkVersion rootProject.ext.compileSdkVersion

    defaultConfig {
        applicationId "com.example.testapp"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 789
        versionName "1.2.3"
    }
}`;

// Import the functions we want to test
// Since the original file doesn't export functions, we'll need to extract them
const REGEX_PATTERNS = {
  IOS_VERSION:
    /<key>CFBundleShortVersionString<\/key>\s*<string>(.*?)<\/string>/,
  IOS_BUILD: /CURRENT_PROJECT_VERSION = (\d+);/,
  ANDROID_VERSION: /versionName\s+"(.+?)"/,
  ANDROID_VERSION_CODE: /versionCode\s+(\d+)/,
};

// Test helper functions
function extractIOSVersion(infoPlistContent) {
  if (!infoPlistContent) return 'Unknown';
  const match = infoPlistContent.match(REGEX_PATTERNS.IOS_VERSION);
  return match ? match[1] : 'Unknown';
}

function extractIOSBuild(projectFileContent) {
  if (!projectFileContent) return 'Unknown';
  const match = projectFileContent.match(REGEX_PATTERNS.IOS_BUILD);
  return match ? match[1] : 'Unknown';
}

function extractAndroidVersion(buildGradleContent) {
  if (!buildGradleContent) return 'Unknown';
  const match = buildGradleContent.match(REGEX_PATTERNS.ANDROID_VERSION);
  return match ? match[1] : 'Unknown';
}

function extractAndroidVersionCode(buildGradleContent) {
  if (!buildGradleContent) return 'Unknown';
  const match = buildGradleContent.match(REGEX_PATTERNS.ANDROID_VERSION_CODE);
  return match ? match[1] : 'Unknown';
}

// Tests
describe('Mobile Deploy Confirm - File Parsing', () => {
  describe('iOS Version Extraction', () => {
    it('should extract iOS version from Info.plist', () => {
      const version = extractIOSVersion(MOCK_IOS_INFO_PLIST);
      assert.strictEqual(version, '1.2.3');
    });

    it('should return "Unknown" for malformed Info.plist', () => {
      const malformedPlist =
        '<dict><key>InvalidKey</key><string>value</string></dict>';
      const version = extractIOSVersion(malformedPlist);
      assert.strictEqual(version, 'Unknown');
    });

    it('should extract iOS build number from project.pbxproj', () => {
      const build = extractIOSBuild(MOCK_IOS_PROJECT_FILE);
      assert.strictEqual(build, '456');
    });

    it('should return "Unknown" for malformed project file', () => {
      const malformedProject = 'invalid project file content';
      const build = extractIOSBuild(malformedProject);
      assert.strictEqual(build, 'Unknown');
    });

    it('should handle multiple CURRENT_PROJECT_VERSION entries', () => {
      const multipleEntries = `
        CURRENT_PROJECT_VERSION = 123;
        CURRENT_PROJECT_VERSION = 456;
      `;
      const build = extractIOSBuild(multipleEntries);
      assert.strictEqual(build, '123'); // Should match the first occurrence
    });
  });

  describe('Android Version Extraction', () => {
    it('should extract Android version from build.gradle', () => {
      const version = extractAndroidVersion(MOCK_ANDROID_BUILD_GRADLE);
      assert.strictEqual(version, '1.2.3');
    });

    it('should extract Android version code from build.gradle', () => {
      const versionCode = extractAndroidVersionCode(MOCK_ANDROID_BUILD_GRADLE);
      assert.strictEqual(versionCode, '789');
    });

    it('should return "Unknown" for malformed build.gradle', () => {
      const malformedGradle = 'invalid gradle content';
      const version = extractAndroidVersion(malformedGradle);
      const versionCode = extractAndroidVersionCode(malformedGradle);
      assert.strictEqual(version, 'Unknown');
      assert.strictEqual(versionCode, 'Unknown');
    });

    it('should handle different versionName formats', () => {
      const gradleWithSingleQuotes = `versionName '2.0.0'`;
      const gradleWithDoubleQuotes = `versionName "2.0.0"`;
      const gradleWithSpacing = `versionName    "2.0.0"`;

      // Current regex only handles double quotes
      assert.strictEqual(
        extractAndroidVersion(gradleWithDoubleQuotes),
        '2.0.0',
      );
      assert.strictEqual(extractAndroidVersion(gradleWithSpacing), '2.0.0');
      assert.strictEqual(
        extractAndroidVersion(gradleWithSingleQuotes),
        'Unknown',
      );
    });

    it('should handle different versionCode formats', () => {
      const gradleWithSpacing = `versionCode    123`;
      const gradleWithTabs = `versionCode\t456`;

      assert.strictEqual(extractAndroidVersionCode(gradleWithSpacing), '123');
      assert.strictEqual(extractAndroidVersionCode(gradleWithTabs), '456');
    });
  });

  describe('Real File Integration Tests', () => {
    it('should parse actual iOS Info.plist if it exists', () => {
      const infoPlistPath = join(__dirname, '../ios/OpenPassport/Info.plist');

      if (existsSync(infoPlistPath)) {
        const content = readFileSync(infoPlistPath, 'utf8');
        const version = extractIOSVersion(content);

        // Should either be a valid version or 'Unknown'
        assert.strictEqual(typeof version, 'string');
        assert.ok(version.length > 0);
      } else {
        console.warn('iOS Info.plist not found - skipping real file test');
      }
    });

    it('should parse actual iOS project.pbxproj if it exists', () => {
      const projectPath = join(
        __dirname,
        '../ios/Self.xcodeproj/project.pbxproj',
      );

      if (existsSync(projectPath)) {
        const content = readFileSync(projectPath, 'utf8');
        const build = extractIOSBuild(content);

        // Should either be a valid build number or 'Unknown'
        assert.strictEqual(typeof build, 'string');
        assert.ok(build.length > 0);

        // If it's a number, it should be positive
        if (build !== 'Unknown') {
          assert.ok(parseInt(build, 10) > 0);
        }
      } else {
        console.warn('iOS project.pbxproj not found - skipping real file test');
      }
    });

    it('should parse actual Android build.gradle if it exists', () => {
      const buildGradlePath = join(__dirname, '../android/app/build.gradle');

      if (existsSync(buildGradlePath)) {
        const content = readFileSync(buildGradlePath, 'utf8');
        const version = extractAndroidVersion(content);
        const versionCode = extractAndroidVersionCode(content);

        // Should either be valid values or 'Unknown'
        assert.strictEqual(typeof version, 'string');
        assert.strictEqual(typeof versionCode, 'string');
        assert.ok(version.length > 0);
        assert.ok(versionCode.length > 0);

        // If versionCode is a number, it should be positive
        if (versionCode !== 'Unknown') {
          assert.ok(parseInt(versionCode, 10) > 0);
        }
      } else {
        console.warn(
          'Android build.gradle not found - skipping real file test',
        );
      }
    });

    it('should parse actual package.json if it exists', () => {
      const packageJsonPath = join(__dirname, '../package.json');

      if (existsSync(packageJsonPath)) {
        const content = readFileSync(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(content);

        assert.ok(Object.hasOwn(packageJson, 'version'));
        assert.strictEqual(typeof packageJson.version, 'string');
        assert.ok(packageJson.version.match(/^\d+\.\d+\.\d+/)); // Basic semver check
      } else {
        console.warn('package.json not found - skipping real file test');
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty file contents', () => {
      assert.strictEqual(extractIOSVersion(''), 'Unknown');
      assert.strictEqual(extractIOSBuild(''), 'Unknown');
      assert.strictEqual(extractAndroidVersion(''), 'Unknown');
      assert.strictEqual(extractAndroidVersionCode(''), 'Unknown');
    });

    it('should handle null/undefined inputs', () => {
      assert.strictEqual(extractIOSVersion(null), 'Unknown');
      assert.strictEqual(extractIOSBuild(undefined), 'Unknown');
      assert.strictEqual(extractAndroidVersion(null), 'Unknown');
      assert.strictEqual(extractAndroidVersionCode(undefined), 'Unknown');
    });

    it('should handle very large version numbers', () => {
      const largeVersionPlist = MOCK_IOS_INFO_PLIST.replace(
        '1.2.3',
        '999.999.999',
      );
      const largeVersionGradle = MOCK_ANDROID_BUILD_GRADLE.replace(
        '1.2.3',
        '999.999.999',
      );
      const largeBuildProject = MOCK_IOS_PROJECT_FILE.replace('456', '999999');
      const largeVersionCodeGradle = MOCK_ANDROID_BUILD_GRADLE.replace(
        '789',
        '999999',
      );

      assert.strictEqual(extractIOSVersion(largeVersionPlist), '999.999.999');
      assert.strictEqual(
        extractAndroidVersion(largeVersionGradle),
        '999.999.999',
      );
      assert.strictEqual(extractIOSBuild(largeBuildProject), '999999');
      assert.strictEqual(
        extractAndroidVersionCode(largeVersionCodeGradle),
        '999999',
      );
    });

    it('should handle version strings with special characters', () => {
      const specialVersionPlist = MOCK_IOS_INFO_PLIST.replace(
        '1.2.3',
        '1.2.3-beta.1',
      );
      const specialVersionGradle = MOCK_ANDROID_BUILD_GRADLE.replace(
        '1.2.3',
        '1.2.3-beta.1',
      );

      assert.strictEqual(
        extractIOSVersion(specialVersionPlist),
        '1.2.3-beta.1',
      );
      assert.strictEqual(
        extractAndroidVersion(specialVersionGradle),
        '1.2.3-beta.1',
      );
    });
  });
});

console.log(
  '✅ All tests defined. Run with: node --test mobile-deploy-confirm.test.cjs',
);
