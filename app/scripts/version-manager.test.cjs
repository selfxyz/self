// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * @jest-environment node
 *
 * SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
 * SPDX-License-Identifier: BUSL-1.1
 * NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.
 */

/**
 * Unit tests for version-manager.cjs
 *
 * This file is only meant to be run with Jest.
 */

const path = require('path');

// Mock file system operations - data
const mockPackageJson = { version: '1.2.3' };
const mockVersionJson = {
  ios: { build: 100, lastDeployed: '2024-01-01T00:00:00Z' },
  android: { build: 200, lastDeployed: '2024-01-01T00:00:00Z' },
};
const mockBuildGradle = `android {
    defaultConfig {
        versionCode 200
        versionName "1.2.3"
    }
}`;
const mockPbxproj = `buildSettings = {
    CURRENT_PROJECT_VERSION = 100;
    MARKETING_VERSION = 1.2.3;
};`;

// Use manual mocking instead of jest.mock to avoid hoisting issues
const fs = require('fs');

// Store originals for restore
const originalReadFileSync = fs.readFileSync;
const originalWriteFileSync = fs.writeFileSync;
const originalExistsSync = fs.existsSync;
const originalAppendFileSync = fs.appendFileSync;

// Setup mocks before importing the module
function setupMocks() {
  fs.readFileSync = function (filePath, encoding) {
    if (filePath.includes('package.json')) {
      return JSON.stringify(mockPackageJson);
    }
    if (filePath.includes('version.json')) {
      return JSON.stringify(mockVersionJson);
    }
    if (filePath.includes('build.gradle')) {
      return mockBuildGradle;
    }
    if (filePath.includes('project.pbxproj')) {
      return mockPbxproj;
    }
    return originalReadFileSync(filePath, encoding);
  };

  fs.writeFileSync = function () {};
  fs.existsSync = function () {
    return true;
  };
  fs.appendFileSync = function () {};
}

function restoreMocks() {
  fs.readFileSync = originalReadFileSync;
  fs.writeFileSync = originalWriteFileSync;
  fs.existsSync = originalExistsSync;
  fs.appendFileSync = originalAppendFileSync;
}

// Setup mocks before requiring the module
setupMocks();

// Import module after mocks are set up
const versionManager = require('./version-manager.cjs');

describe('version-manager', () => {
  beforeEach(() => {
    // Reset mock data
    mockPackageJson.version = '1.2.3';
    mockVersionJson.ios.build = 100;
    mockVersionJson.android.build = 200;
  });

  afterAll(() => {
    restoreMocks();
  });

  describe('getVersionInfo', () => {
    it('should return current version information', () => {
      const info = versionManager.getVersionInfo();
      expect(info.version).toBe('1.2.3');
      expect(info.iosBuild).toBe(100);
      expect(info.androidBuild).toBe(200);
    });
  });

  describe('bumpVersion', () => {
    it('should bump major version correctly', () => {
      const result = versionManager.bumpVersion('major', 'both');
      expect(result.version).toBe('2.0.0');
      expect(result.iosBuild).toBe(101);
      expect(result.androidBuild).toBe(201);
    });

    it('should bump minor version correctly', () => {
      const result = versionManager.bumpVersion('minor', 'both');
      expect(result.version).toBe('1.3.0');
      expect(result.iosBuild).toBe(101);
      expect(result.androidBuild).toBe(201);
    });

    it('should bump patch version correctly', () => {
      const result = versionManager.bumpVersion('patch', 'both');
      expect(result.version).toBe('1.2.4');
      expect(result.iosBuild).toBe(101);
      expect(result.androidBuild).toBe(201);
    });

    it('should bump build numbers only', () => {
      const result = versionManager.bumpVersion('build', 'both');
      expect(result.version).toBe('1.2.3');
      expect(result.iosBuild).toBe(101);
      expect(result.androidBuild).toBe(201);
    });

    it('should respect platform parameter (ios only)', () => {
      const result = versionManager.bumpVersion('build', 'ios');
      expect(result.version).toBe('1.2.3');
      expect(result.iosBuild).toBe(101);
      expect(result.androidBuild).toBe(200); // unchanged
    });

    it('should respect platform parameter (android only)', () => {
      const result = versionManager.bumpVersion('build', 'android');
      expect(result.version).toBe('1.2.3');
      expect(result.iosBuild).toBe(100); // unchanged
      expect(result.androidBuild).toBe(201);
    });

    it('should throw on invalid bump type', () => {
      expect(() => versionManager.bumpVersion('invalid', 'both')).toThrow(
        /Invalid bump type/,
      );
    });

    it('should throw on invalid platform', () => {
      expect(() => versionManager.bumpVersion('build', 'invalid')).toThrow(
        /Invalid platform/,
      );
    });

    it('should handle version with major bump resetting minor and patch', () => {
      mockPackageJson.version = '2.5.8';
      const result = versionManager.bumpVersion('major', 'both');
      expect(result.version).toBe('3.0.0');
    });

    it('should handle version with minor bump resetting patch', () => {
      mockPackageJson.version = '2.5.8';
      const result = versionManager.bumpVersion('minor', 'both');
      expect(result.version).toBe('2.6.0');
    });
  });

  describe('applyVersions', () => {
    it('should reject invalid version format - not semver', () => {
      expect(() => versionManager.applyVersions('invalid', 1, 1)).toThrow(
        /Invalid version format/,
      );
    });

    it('should reject invalid version format - two parts', () => {
      expect(() => versionManager.applyVersions('1.2', 1, 1)).toThrow(
        /Invalid version format/,
      );
    });

    it('should reject invalid version format - four parts', () => {
      expect(() => versionManager.applyVersions('1.2.3.4', 1, 1)).toThrow(
        /Invalid version format/,
      );
    });

    it('should reject invalid version format - empty string', () => {
      expect(() => versionManager.applyVersions('', 1, 1)).toThrow(
        /Invalid version format/,
      );
    });

    it('should reject invalid version format - null', () => {
      expect(() => versionManager.applyVersions(null, 1, 1)).toThrow(
        /Invalid version format/,
      );
    });

    it('should reject invalid iOS build number - zero', () => {
      expect(() => versionManager.applyVersions('1.2.3', 0, 1)).toThrow(
        /Invalid iOS build/,
      );
    });

    it('should reject invalid iOS build number - negative', () => {
      expect(() => versionManager.applyVersions('1.2.3', -1, 1)).toThrow(
        /Invalid iOS build/,
      );
    });

    it('should reject invalid iOS build number - non-numeric string', () => {
      expect(() => versionManager.applyVersions('1.2.3', 'abc', 1)).toThrow(
        /Invalid iOS build/,
      );
    });

    it('should reject invalid iOS build number - float', () => {
      expect(() => versionManager.applyVersions('1.2.3', 1.5, 1)).toThrow(
        /Invalid iOS build/,
      );
    });

    it('should reject invalid Android build number - zero', () => {
      expect(() => versionManager.applyVersions('1.2.3', 1, 0)).toThrow(
        /Invalid Android build/,
      );
    });

    it('should reject invalid Android build number - negative', () => {
      expect(() => versionManager.applyVersions('1.2.3', 1, -1)).toThrow(
        /Invalid Android build/,
      );
    });

    it('should reject invalid Android build number - non-numeric string', () => {
      expect(() => versionManager.applyVersions('1.2.3', 1, 'xyz')).toThrow(
        /Invalid Android build/,
      );
    });

    it('should reject invalid Android build number - float', () => {
      expect(() => versionManager.applyVersions('1.2.3', 1, 2.5)).toThrow(
        /Invalid Android build/,
      );
    });

    it('should accept string build numbers that parse to integers', () => {
      expect(() =>
        versionManager.applyVersions('1.2.3', '100', '200'),
      ).not.toThrow();
    });

    it('should accept large build numbers', () => {
      expect(() =>
        versionManager.applyVersions('1.2.3', 99999, 88888),
      ).not.toThrow();
    });

    it('should write correct values to files', () => {
      // Track write calls
      const writeCalls = [];
      fs.writeFileSync = function (filePath, content) {
        writeCalls.push({ filePath, content });
      };

      versionManager.applyVersions('2.0.0', 150, 250);

      // Verify writes occurred:
      // 1. package.json, 2. version.json,
      // 3. build.gradle (versionCode), 4. pbxproj (CURRENT_PROJECT_VERSION),
      // 5. pbxproj (MARKETING_VERSION)
      expect(writeCalls.length).toBe(5);

      // Find and verify package.json write
      const packageWrite = writeCalls.find(call =>
        call.filePath.includes('package.json'),
      );
      expect(packageWrite).toBeDefined();
      const updatedPackage = JSON.parse(packageWrite.content);
      expect(updatedPackage.version).toBe('2.0.0');

      // Find and verify version.json write
      const versionWrite = writeCalls.find(call =>
        call.filePath.includes('version.json'),
      );
      expect(versionWrite).toBeDefined();
      const updatedVersion = JSON.parse(versionWrite.content);
      expect(updatedVersion.ios.build).toBe(150);
      expect(updatedVersion.android.build).toBe(250);

      // Find and verify build.gradle write
      const gradleWrite = writeCalls.find(call =>
        call.filePath.includes('build.gradle'),
      );
      expect(gradleWrite).toBeDefined();
      expect(gradleWrite.content).toContain('versionCode 250');

      // Find and verify pbxproj writes
      const pbxprojWrites = writeCalls.filter(call =>
        call.filePath.includes('project.pbxproj'),
      );
      expect(pbxprojWrites.length).toBe(2);
      expect(pbxprojWrites[0].content).toContain(
        'CURRENT_PROJECT_VERSION = 150;',
      );
      expect(pbxprojWrites[1].content).toContain('MARKETING_VERSION = 2.0.0;');

      // Ensure every managed file is touched by applyVersions.
      // (pbxproj is written twice due to two replacements.)
      const managedFiles = versionManager.getVersionManagedFiles();
      for (const managedFile of managedFiles) {
        const touched = writeCalls.some(call =>
          call.filePath.includes(managedFile),
        );
        expect(touched).toBe(true);
      }
    });
  });

  describe('getVersionManagedFiles', () => {
    it('should return the expected managed file paths', () => {
      expect(versionManager.getVersionManagedFiles()).toEqual([
        'package.json',
        'version.json',
        path.join('android', 'app', 'build.gradle'),
        path.join('ios', 'Self.xcodeproj', 'project.pbxproj'),
      ]);
    });

    it('should return a new array each time', () => {
      const files = versionManager.getVersionManagedFiles();
      files.push('unexpected-file');

      expect(versionManager.getVersionManagedFiles()).not.toContain(
        'unexpected-file',
      );
    });
  });

  describe('readPackageJson', () => {
    it('should read and parse package.json', () => {
      const pkg = versionManager.readPackageJson();
      expect(pkg.version).toBe('1.2.3');
    });

    it('should throw error if file does not exist', () => {
      const originalExists = fs.existsSync;
      fs.existsSync = function () {
        return false;
      };
      expect(() => versionManager.readPackageJson()).toThrow(
        /package.json not found/,
      );
      fs.existsSync = originalExists;
    });
  });

  describe('readVersionJson', () => {
    it('should read and parse version.json', () => {
      const version = versionManager.readVersionJson();
      expect(version.ios.build).toBe(100);
      expect(version.android.build).toBe(200);
    });

    it('should throw error if file does not exist', () => {
      const originalExists = fs.existsSync;
      fs.existsSync = function () {
        return false;
      };
      expect(() => versionManager.readVersionJson()).toThrow(
        /version.json not found/,
      );
      fs.existsSync = originalExists;
    });
  });

  describe('applyVersions - additional edge cases', () => {
    it('should handle iosSuccess=false and androidSuccess=true', () => {
      const writeCalls = [];
      fs.writeFileSync = function (filePath, content) {
        writeCalls.push({ filePath, content });
      };

      versionManager.applyVersions('2.5.0', 120, 220, {
        iosSuccess: false,
        androidSuccess: true,
      });

      // Verify package.json was updated
      const packageWrite = writeCalls.find(call =>
        call.filePath.includes('package.json'),
      );
      expect(packageWrite).toBeDefined();

      // Verify version.json - Android should be updated, iOS should not
      const versionWrite = writeCalls.find(call =>
        call.filePath.includes('version.json'),
      );
      expect(versionWrite).toBeDefined();
      const updatedVersion = JSON.parse(versionWrite.content);
      expect(updatedVersion.android.build).toBe(220);
      expect(updatedVersion.ios.build).toBe(100); // Should remain unchanged

      // Verify Android build.gradle was updated
      const gradleWrite = writeCalls.find(call =>
        call.filePath.includes('build.gradle'),
      );
      expect(gradleWrite).toBeDefined();
      expect(gradleWrite.content).toContain('versionCode 220');

      // Verify iOS CURRENT_PROJECT_VERSION was NOT updated
      const pbxprojWrites = writeCalls.filter(call =>
        call.filePath.includes('project.pbxproj'),
      );
      // Only MARKETING_VERSION should be updated (always synced)
      expect(pbxprojWrites.length).toBe(1);
      expect(pbxprojWrites[0].content).toContain('MARKETING_VERSION = 2.5.0;');
      expect(pbxprojWrites[0].content).not.toContain(
        'CURRENT_PROJECT_VERSION = 120;',
      );
    });

    it('should handle iosSuccess=true and androidSuccess=false', () => {
      const writeCalls = [];
      fs.writeFileSync = function (filePath, content) {
        writeCalls.push({ filePath, content });
      };

      versionManager.applyVersions('3.0.0', 150, 250, {
        iosSuccess: true,
        androidSuccess: false,
      });

      // Verify version.json - iOS should be updated, Android should not
      const versionWrite = writeCalls.find(call =>
        call.filePath.includes('version.json'),
      );
      expect(versionWrite).toBeDefined();
      const updatedVersion = JSON.parse(versionWrite.content);
      expect(updatedVersion.ios.build).toBe(150);
      expect(updatedVersion.android.build).toBe(200); // Should remain unchanged

      // Verify Android build.gradle was NOT updated
      const gradleWrites = writeCalls.filter(call =>
        call.filePath.includes('build.gradle'),
      );
      expect(gradleWrites.length).toBe(0);

      // Verify iOS CURRENT_PROJECT_VERSION was updated
      const pbxprojWrites = writeCalls.filter(call =>
        call.filePath.includes('project.pbxproj'),
      );
      expect(pbxprojWrites.length).toBe(2); // BUILD + MARKETING
      const buildWrite = pbxprojWrites.find(call =>
        call.content.includes('CURRENT_PROJECT_VERSION = 150;'),
      );
      expect(buildWrite).toBeDefined();
    });

    it('should handle both platforms failing', () => {
      const writeCalls = [];
      fs.writeFileSync = function (filePath, content) {
        writeCalls.push({ filePath, content });
      };

      versionManager.applyVersions('2.7.5', 130, 230, {
        iosSuccess: false,
        androidSuccess: false,
      });

      // Verify package.json was still updated
      const packageWrite = writeCalls.find(call =>
        call.filePath.includes('package.json'),
      );
      expect(packageWrite).toBeDefined();

      // Verify version.json - nothing should be updated except file write
      const versionWrite = writeCalls.find(call =>
        call.filePath.includes('version.json'),
      );
      expect(versionWrite).toBeDefined();
      const updatedVersion = JSON.parse(versionWrite.content);
      expect(updatedVersion.ios.build).toBe(100); // unchanged
      expect(updatedVersion.android.build).toBe(200); // unchanged

      // Verify no build files were updated
      const gradleWrites = writeCalls.filter(call =>
        call.filePath.includes('build.gradle'),
      );
      expect(gradleWrites.length).toBe(0);

      // Only MARKETING_VERSION should be updated for iOS
      const pbxprojWrites = writeCalls.filter(call =>
        call.filePath.includes('project.pbxproj'),
      );
      expect(pbxprojWrites.length).toBe(1);
      expect(pbxprojWrites[0].content).toContain('MARKETING_VERSION = 2.7.5;');
    });
  });

  describe('bumpVersion - edge cases', () => {
    it('should handle incrementing from version 0.0.1', () => {
      mockPackageJson.version = '0.0.1';
      const result = versionManager.bumpVersion('patch', 'both');
      expect(result.version).toBe('0.0.2');
    });

    it('should handle incrementing from version 0.1.0', () => {
      mockPackageJson.version = '0.1.0';
      const result = versionManager.bumpVersion('minor', 'both');
      expect(result.version).toBe('0.2.0');
    });

    it('should handle incrementing from version 1.0.0', () => {
      mockPackageJson.version = '1.0.0';
      const result = versionManager.bumpVersion('major', 'both');
      expect(result.version).toBe('2.0.0');
    });

    it('should handle large version numbers', () => {
      mockPackageJson.version = '99.99.99';
      const result = versionManager.bumpVersion('patch', 'both');
      expect(result.version).toBe('99.99.100');
    });

    it('should handle build bump with large build numbers', () => {
      mockVersionJson.ios.build = 9999;
      mockVersionJson.android.build = 8888;
      const result = versionManager.bumpVersion('build', 'both');
      expect(result.iosBuild).toBe(10000);
      expect(result.androidBuild).toBe(8889);
    });

    it('should throw error for malformed version string', () => {
      mockPackageJson.version = 'not.a.version';
      expect(() => versionManager.bumpVersion('patch', 'both')).toThrow(
        /Invalid version format/,
      );
    });

    it('should throw error for version with non-numeric parts', () => {
      mockPackageJson.version = '1.two.3';
      expect(() => versionManager.bumpVersion('patch', 'both')).toThrow(
        /Invalid version format/,
      );
    });
  });

  describe('getVersionManagedFiles - immutability', () => {
    it('should return independent arrays on each call', () => {
      const files1 = versionManager.getVersionManagedFiles();
      const files2 = versionManager.getVersionManagedFiles();

      // Modify first array
      files1.push('extra-file.txt');

      // Second array should be unaffected
      expect(files2).not.toContain('extra-file.txt');
      expect(files1.length).toBe(files2.length + 1);
    });
  });

  describe('readPackageJson - error handling', () => {
    it('should throw descriptive error on malformed JSON', () => {
      const originalRead = fs.readFileSync;
      fs.readFileSync = function (filePath, encoding) {
        if (filePath.includes('package.json')) {
          return '{ invalid json }';
        }
        return originalRead(filePath, encoding);
      };

      expect(() => versionManager.readPackageJson()).toThrow(
        /Failed to parse package.json/,
      );

      fs.readFileSync = originalRead;
    });
  });

  describe('readVersionJson - error handling', () => {
    it('should throw descriptive error on malformed JSON', () => {
      const originalRead = fs.readFileSync;
      fs.readFileSync = function (filePath, encoding) {
        if (filePath.includes('version.json')) {
          return '{ "incomplete": ';
        }
        if (filePath.includes('package.json')) {
          return JSON.stringify(mockPackageJson);
        }
        return originalRead(filePath, encoding);
      };

      expect(() => versionManager.readVersionJson()).toThrow(
        /Failed to parse version.json/,
      );

      fs.readFileSync = originalRead;
    });
  });

  describe('applyVersions - regression tests', () => {
    it('should always update MARKETING_VERSION even when iOS build fails', () => {
      const writeCalls = [];
      fs.writeFileSync = function (filePath, content) {
        writeCalls.push({ filePath, content });
      };

      versionManager.applyVersions('2.8.0', 140, 240, {
        iosSuccess: false,
        androidSuccess: true,
      });

      // MARKETING_VERSION should always be updated to match package.json
      const pbxprojWrites = writeCalls.filter(call =>
        call.filePath.includes('project.pbxproj'),
      );

      const marketingWrite = pbxprojWrites.find(call =>
        call.content.includes('MARKETING_VERSION = 2.8.0;'),
      );
      expect(marketingWrite).toBeDefined();
    });

    it('should update lastDeployed timestamp when build succeeds', () => {
      const writeCalls = [];
      const beforeTime = new Date().toISOString();

      fs.writeFileSync = function (filePath, content) {
        writeCalls.push({ filePath, content });
      };

      versionManager.applyVersions('2.9.0', 160, 260, {
        iosSuccess: true,
        androidSuccess: true,
      });

      const afterTime = new Date().toISOString();

      const versionWrite = writeCalls.find(call =>
        call.filePath.includes('version.json'),
      );
      const updatedVersion = JSON.parse(versionWrite.content);

      // Verify timestamps are valid and recent
      expect(updatedVersion.ios.lastDeployed).toBeDefined();
      expect(updatedVersion.android.lastDeployed).toBeDefined();

      const iosTime = new Date(updatedVersion.ios.lastDeployed);
      const androidTime = new Date(updatedVersion.android.lastDeployed);

      expect(iosTime.toISOString()).toBe(updatedVersion.ios.lastDeployed);
      expect(androidTime.toISOString()).toBe(updatedVersion.android.lastDeployed);

      // Timestamps should be between before and after
      expect(updatedVersion.ios.lastDeployed).toBeGreaterThanOrEqual(
        beforeTime,
      );
      expect(updatedVersion.ios.lastDeployed).toBeLessThanOrEqual(afterTime);
    });

    it('should not update lastDeployed timestamp when build fails', () => {
      const writeCalls = [];
      fs.writeFileSync = function (filePath, content) {
        writeCalls.push({ filePath, content });
      };

      versionManager.applyVersions('2.9.5', 165, 265, {
        iosSuccess: false,
        androidSuccess: false,
      });

      const versionWrite = writeCalls.find(call =>
        call.filePath.includes('version.json'),
      );
      const updatedVersion = JSON.parse(versionWrite.content);

      // Timestamps should remain the original values
      expect(updatedVersion.ios.lastDeployed).toBe(
        '2024-01-01T00:00:00Z',
      );
      expect(updatedVersion.android.lastDeployed).toBe(
        '2024-01-01T00:00:00Z',
      );
    });
  });

  describe('bumpVersion - boundary conditions', () => {
    it('should handle patch version at 0', () => {
      mockPackageJson.version = '1.2.0';
      const result = versionManager.bumpVersion('patch', 'both');
      expect(result.version).toBe('1.2.1');
    });

    it('should handle minor version at 0', () => {
      mockPackageJson.version = '1.0.5';
      const result = versionManager.bumpVersion('minor', 'both');
      expect(result.version).toBe('1.1.0');
    });

    it('should handle major version at 0', () => {
      mockPackageJson.version = '0.5.3';
      const result = versionManager.bumpVersion('major', 'both');
      expect(result.version).toBe('1.0.0');
    });

    it('should handle consecutive bumps correctly', () => {
      mockPackageJson.version = '1.2.3';

      // First bump
      let result = versionManager.bumpVersion('patch', 'both');
      expect(result.version).toBe('1.2.4');

      // Simulate the bump being applied
      mockPackageJson.version = result.version;
      mockVersionJson.ios.build = result.iosBuild;
      mockVersionJson.android.build = result.androidBuild;

      // Second bump
      result = versionManager.bumpVersion('minor', 'both');
      expect(result.version).toBe('1.3.0');
      expect(result.iosBuild).toBe(102); // Incremented again
      expect(result.androidBuild).toBe(202);

      // Simulate the bump being applied
      mockPackageJson.version = result.version;
      mockVersionJson.ios.build = result.iosBuild;
      mockVersionJson.android.build = result.androidBuild;

      // Third bump
      result = versionManager.bumpVersion('major', 'both');
      expect(result.version).toBe('2.0.0');
      expect(result.iosBuild).toBe(103);
      expect(result.androidBuild).toBe(203);
    });
  });
});