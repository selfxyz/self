// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
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

      // Verify writes occurred
      expect(writeCalls.length).toBe(2);

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
});
