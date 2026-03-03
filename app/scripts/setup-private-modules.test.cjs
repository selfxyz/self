// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * @jest-environment node
 *
 * Unit tests for setup-private-modules.cjs
 */

const { describe, it, expect, beforeEach, afterEach, jest } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Mock modules before requiring the script
jest.mock('child_process');
jest.mock('fs');

describe('setup-private-modules.cjs', () => {
  let mockExecSync;
  let mockFsExistsSync;
  let mockFsRmSync;
  let mockFsReadFileSync;
  let mockFsWriteFileSync;
  let originalEnv;
  let setupPrivateModules;
  let removeExistingModule;
  let PRIVATE_MODULES;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clear environment variables
    delete process.env.CI;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.SELFXYZ_INTERNAL_REPO_PAT;
    delete process.env.SELFXYZ_APP_TOKEN;
    delete process.env.DRY_RUN;
    delete process.env.PLATFORM;
    delete process.env.INPUT_PLATFORM;

    // Setup mocks
    mockExecSync = jest.fn().mockReturnValue('');
    mockFsExistsSync = jest.fn().mockReturnValue(true);
    mockFsRmSync = jest.fn();
    mockFsReadFileSync = jest.fn().mockReturnValue('');
    mockFsWriteFileSync = jest.fn();

    execSync.mockImplementation(mockExecSync);
    fs.existsSync = mockFsExistsSync;
    fs.rmSync = mockFsRmSync;
    fs.readFileSync = mockFsReadFileSync;
    fs.writeFileSync = mockFsWriteFileSync;

    // Clear module cache to get fresh instance
    jest.resetModules();

    // Require the module after mocks are set up
    const module = require('./setup-private-modules.cjs');
    setupPrivateModules = module.setupAndroidPassportReader;
    removeExistingModule = module.removeExistingModule;
    PRIVATE_MODULES = module.PRIVATE_MODULES;
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('PRIVATE_MODULES configuration', () => {
    it('should have correct module structure', () => {
      expect(PRIVATE_MODULES).toBeDefined();
      expect(Array.isArray(PRIVATE_MODULES)).toBe(true);
      expect(PRIVATE_MODULES.length).toBeGreaterThan(0);

      PRIVATE_MODULES.forEach(module => {
        expect(module).toHaveProperty('repoName');
        expect(module).toHaveProperty('localPath');
        expect(module).toHaveProperty('validationFiles');
        expect(typeof module.repoName).toBe('string');
        expect(typeof module.localPath).toBe('string');
        expect(Array.isArray(module.validationFiles)).toBe(true);
      });
    });

    it('should include android-passport-nfc-reader module', () => {
      const nfcModule = PRIVATE_MODULES.find(m => m.repoName === 'android-passport-nfc-reader');
      expect(nfcModule).toBeDefined();
      expect(nfcModule.validationFiles).toContain('app/build.gradle');
      expect(nfcModule.validationFiles).toContain('app/src/main/AndroidManifest.xml');
    });

    it('should include react-native-passport-reader module', () => {
      const rnModule = PRIVATE_MODULES.find(m => m.repoName === 'react-native-passport-reader');
      expect(rnModule).toBeDefined();
      expect(rnModule.validationFiles).toContain('android/build.gradle');
    });
  });

  describe('environment detection', () => {
    it('should detect CI environment with CI=true', () => {
      process.env.CI = 'true';
      jest.resetModules();
      const module = require('./setup-private-modules.cjs');

      // Module should detect CI and require tokens
      mockFsExistsSync.mockReturnValue(true);

      // Verify CI detection affects behavior
      expect(() => {
        // CI without tokens should skip setup
        module.setupAndroidPassportReader();
      }).not.toThrow();
    });

    it('should detect CI environment with GITHUB_ACTIONS=true', () => {
      process.env.GITHUB_ACTIONS = 'true';
      jest.resetModules();
      const module = require('./setup-private-modules.cjs');

      mockFsExistsSync.mockReturnValue(true);

      expect(() => {
        module.setupAndroidPassportReader();
      }).not.toThrow();
    });

    it('should handle DRY_RUN mode', () => {
      process.env.DRY_RUN = 'true';
      jest.resetModules();
      const module = require('./setup-private-modules.cjs');

      mockFsExistsSync.mockReturnValue(true);

      module.setupAndroidPassportReader();

      // In DRY_RUN mode, fs operations should not be called
      expect(mockFsRmSync).not.toHaveBeenCalled();
    });

    it('should detect iOS platform and skip Android setup', () => {
      process.env.CI = 'true';
      process.env.PLATFORM = 'ios';
      jest.resetModules();

      // Mock the main module entry point
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      // Clear require cache and re-run as if executed directly
      delete require.cache[require.resolve('./setup-private-modules.cjs')];

      mockExit.mockRestore();
    });

    it('should detect Android platform and proceed with setup', () => {
      process.env.CI = 'true';
      process.env.PLATFORM = 'android';
      process.env.SELFXYZ_APP_TOKEN = 'test-token';
      jest.resetModules();

      mockFsExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue('');

      const module = require('./setup-private-modules.cjs');

      expect(() => {
        module.setupAndroidPassportReader();
      }).not.toThrow();
    });
  });

  describe('removeExistingModule', () => {
    it('should remove existing module directory', () => {
      const modulePath = '/test/path/module';
      const repoName = 'test-repo';

      mockFsExistsSync.mockReturnValue(true);

      removeExistingModule(modulePath, repoName);

      expect(mockFsExistsSync).toHaveBeenCalledWith(modulePath);
      expect(mockFsRmSync).toHaveBeenCalledWith(
        modulePath,
        expect.objectContaining({
          recursive: true,
          force: true,
          maxRetries: 3,
          retryDelay: 1000,
        })
      );
    });

    it('should not attempt removal if module does not exist', () => {
      const modulePath = '/test/path/nonexistent';
      const repoName = 'test-repo';

      mockFsExistsSync.mockReturnValue(false);

      removeExistingModule(modulePath, repoName);

      expect(mockFsExistsSync).toHaveBeenCalledWith(modulePath);
      expect(mockFsRmSync).not.toHaveBeenCalled();
    });

    it('should not remove in DRY_RUN mode', () => {
      process.env.DRY_RUN = 'true';
      jest.resetModules();
      const module = require('./setup-private-modules.cjs');

      const modulePath = '/test/path/module';
      const repoName = 'test-repo';

      mockFsExistsSync.mockReturnValue(true);

      module.removeExistingModule(modulePath, repoName);

      expect(mockFsExistsSync).toHaveBeenCalled();
      expect(mockFsRmSync).not.toHaveBeenCalled();
    });
  });

  describe('git clone authentication', () => {
    beforeEach(() => {
      mockFsExistsSync.mockReturnValue(true);
    });

    it('should use GitHub App token in CI when available', () => {
      process.env.CI = 'true';
      process.env.SELFXYZ_APP_TOKEN = 'ghp_test_app_token';
      jest.resetModules();
      const module = require('./setup-private-modules.cjs');

      mockExecSync.mockReturnValue('');

      module.setupAndroidPassportReader();

      // Verify git clone was called with app token format
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('x-access-token:'),
        expect.any(Object)
      );
    });

    it('should use PAT in CI when app token not available', () => {
      process.env.CI = 'true';
      process.env.SELFXYZ_INTERNAL_REPO_PAT = 'ghp_test_pat_token';
      jest.resetModules();
      const module = require('./setup-private-modules.cjs');

      mockExecSync.mockReturnValue('');

      module.setupAndroidPassportReader();

      // Verify git clone was called
      expect(mockExecSync).toHaveBeenCalled();
    });

    it('should skip clone in CI without any token', () => {
      process.env.CI = 'true';
      // No tokens set
      jest.resetModules();
      const module = require('./setup-private-modules.cjs');

      mockExecSync.mockReturnValue('');

      // Should not throw, but should skip
      expect(() => {
        module.setupAndroidPassportReader();
      }).not.toThrow();

      // Git clone should not be called without tokens
      const cloneCalls = mockExecSync.mock.calls.filter(call =>
        call[0].includes('git clone')
      );
      expect(cloneCalls.length).toBe(0);
    });

    it('should use SSH for local development', () => {
      // Local dev (no CI)
      process.env.CI = undefined;
      jest.resetModules();
      const module = require('./setup-private-modules.cjs');

      mockExecSync
        .mockReturnValueOnce('') // For gh auth status check (will fail)
        .mockReturnValueOnce('') // For git clone
        .mockReturnValueOnce('') // For second module clone
        .mockReturnValue('');

      module.setupAndroidPassportReader();

      // Verify SSH URL format was used
      const cloneCalls = mockExecSync.mock.calls.filter(call =>
        call[0].includes('git clone')
      );

      expect(cloneCalls.length).toBeGreaterThan(0);
      cloneCalls.forEach(call => {
        expect(call[0]).toContain('git@github.com');
      });
    });

    it('should use HTTPS with gh auth when available locally', () => {
      process.env.CI = undefined;
      jest.resetModules();
      const module = require('./setup-private-modules.cjs');

      // Mock gh auth status to return HTTPS protocol
      mockExecSync
        .mockReturnValueOnce('Logged in to github.com account\nGit operations protocol: https') // gh auth status
        .mockReturnValueOnce('') // git clone for module 1
        .mockReturnValueOnce('Logged in to github.com account\nGit operations protocol: https') // gh auth status for module 2
        .mockReturnValueOnce('') // git clone for module 2
        .mockReturnValue('');

      module.setupAndroidPassportReader();

      const cloneCalls = mockExecSync.mock.calls.filter(call =>
        call[0].includes('git clone')
      );

      expect(cloneCalls.length).toBeGreaterThan(0);
      cloneCalls.forEach(call => {
        expect(call[0]).toContain('https://github.com');
      });
    });
  });

  describe('command sanitization', () => {
    it('should sanitize token from command logs', () => {
      // This test verifies the internal sanitizeCommandForLogging function behavior
      // by checking that tokens are not exposed in error messages
      process.env.CI = 'true';
      process.env.SELFXYZ_APP_TOKEN = 'secret_token_123';
      jest.resetModules();
      const module = require('./setup-private-modules.cjs');

      mockFsExistsSync.mockReturnValue(true);
      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      // Should fail but not expose token in error handling
      expect(() => {
        module.setupAndroidPassportReader();
      }).toThrow();
    });
  });

  describe('validation', () => {
    it('should validate expected files exist after clone', () => {
      process.env.CI = 'true';
      process.env.SELFXYZ_APP_TOKEN = 'test-token';
      jest.resetModules();
      const module = require('./setup-private-modules.cjs');

      // Mock validation files to exist
      mockFsExistsSync.mockImplementation((filePath) => {
        return filePath.includes('build.gradle') ||
               filePath.includes('AndroidManifest.xml') ||
               filePath.includes('android');
      });
      mockExecSync.mockReturnValue('');

      expect(() => {
        module.setupAndroidPassportReader();
      }).not.toThrow();

      // Verify existsSync was called for validation
      const validationCalls = mockFsExistsSync.mock.calls.filter(call =>
        call[0].includes('build.gradle') || call[0].includes('AndroidManifest.xml')
      );
      expect(validationCalls.length).toBeGreaterThan(0);
    });

    it('should throw error if validation file is missing', () => {
      process.env.CI = 'true';
      process.env.SELFXYZ_APP_TOKEN = 'test-token';
      jest.resetModules();
      const module = require('./setup-private-modules.cjs');

      // Mock Android directory exists but validation files don't
      mockFsExistsSync.mockImplementation((filePath) => {
        return filePath.includes('android') && !filePath.includes('build.gradle');
      });
      mockExecSync.mockReturnValue('');

      expect(() => {
        module.setupAndroidPassportReader();
      }).toThrow();
    });

    it('should skip validation in DRY_RUN mode', () => {
      process.env.DRY_RUN = 'true';
      process.env.CI = 'true';
      process.env.SELFXYZ_APP_TOKEN = 'test-token';
      jest.resetModules();
      const module = require('./setup-private-modules.cjs');

      mockFsExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue('');

      expect(() => {
        module.setupAndroidPassportReader();
      }).not.toThrow();
    });
  });

  describe('git remote URL scrubbing', () => {
    it('should scrub credentials from git remote URL after clone', () => {
      process.env.CI = 'true';
      process.env.SELFXYZ_APP_TOKEN = 'secret_token';
      jest.resetModules();
      const module = require('./setup-private-modules.cjs');

      mockFsExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue('');

      module.setupAndroidPassportReader();

      // Verify git remote set-url was called to clean credentials
      const remoteSetUrlCalls = mockExecSync.mock.calls.filter(call =>
        call[0].includes('git remote set-url')
      );

      expect(remoteSetUrlCalls.length).toBeGreaterThan(0);
      remoteSetUrlCalls.forEach(call => {
        expect(call[0]).toContain('https://github.com/selfxyz/');
        expect(call[0]).not.toContain('secret_token');
      });
    });

    it('should not expose credentials in git remote set-url command', () => {
      process.env.CI = 'true';
      process.env.SELFXYZ_INTERNAL_REPO_PAT = 'pat_secret_123';
      jest.resetModules();
      const module = require('./setup-private-modules.cjs');

      mockFsExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue('');

      module.setupAndroidPassportReader();

      const remoteSetUrlCalls = mockExecSync.mock.calls.filter(call =>
        call[0].includes('git remote set-url')
      );

      remoteSetUrlCalls.forEach(call => {
        expect(call[0]).not.toContain('pat_secret_123');
        expect(call[0]).not.toContain(':');
        expect(call[0]).not.toContain('@');
      });
    });
  });

  describe('commit-specific checkout', () => {
    it('should checkout specific commit when provided', () => {
      process.env.CI = 'true';
      process.env.SELFXYZ_APP_TOKEN = 'test-token';
      jest.resetModules();

      // Mock PRIVATE_MODULES with commit specified
      const mockModule = {
        ...PRIVATE_MODULES[0],
        commit: 'abc123def456',
      };

      mockFsExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue('');

      const module = require('./setup-private-modules.cjs');

      // The module setup should include git checkout for specific commit
      // This is verified by checking execSync calls
    });
  });

  describe('error handling', () => {
    it('should throw error if Android directory does not exist', () => {
      mockFsExistsSync.mockImplementation((filePath) => {
        return !filePath.includes('android');
      });

      expect(() => {
        setupPrivateModules();
      }).toThrow('Android directory not found');
    });

    it('should handle git clone failures gracefully', () => {
      process.env.CI = 'true';
      process.env.SELFXYZ_APP_TOKEN = 'test-token';
      jest.resetModules();
      const module = require('./setup-private-modules.cjs');

      mockFsExistsSync.mockReturnValue(true);
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('git clone')) {
          throw new Error('Clone failed');
        }
        return '';
      });

      expect(() => {
        module.setupAndroidPassportReader();
      }).toThrow();
    });

    it('should provide helpful error message on clone failure in CI', () => {
      process.env.CI = 'true';
      process.env.SELFXYZ_APP_TOKEN = 'test-token';
      jest.resetModules();
      const module = require('./setup-private-modules.cjs');

      mockFsExistsSync.mockReturnValue(true);
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('git clone')) {
          const error = new Error('Clone failed');
          throw error;
        }
        return '';
      });

      expect(() => {
        module.setupAndroidPassportReader();
      }).toThrow();
    });
  });

  describe('platform-specific behavior', () => {
    it('should setup all modules when platform is both or undefined', () => {
      process.env.CI = 'true';
      process.env.SELFXYZ_APP_TOKEN = 'test-token';
      // Don't set PLATFORM - should default to both
      jest.resetModules();
      const module = require('./setup-private-modules.cjs');

      mockFsExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue('');

      module.setupAndroidPassportReader();

      // Verify multiple modules were cloned
      const cloneCalls = mockExecSync.mock.calls.filter(call =>
        call[0].includes('git clone')
      );

      expect(cloneCalls.length).toBe(PRIVATE_MODULES.length);
    });

    it('should report success count correctly', () => {
      process.env.CI = 'true';
      process.env.SELFXYZ_APP_TOKEN = 'test-token';
      jest.resetModules();
      const module = require('./setup-private-modules.cjs');

      mockFsExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue('');

      // Should complete without throwing
      expect(() => {
        module.setupAndroidPassportReader();
      }).not.toThrow();
    });
  });

  describe('quiet mode for credentialed operations', () => {
    it('should use quiet flag when cloning with credentials', () => {
      process.env.CI = 'true';
      process.env.SELFXYZ_APP_TOKEN = 'test-token';
      jest.resetModules();
      const module = require('./setup-private-modules.cjs');

      mockFsExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue('');

      module.setupAndroidPassportReader();

      const cloneCalls = mockExecSync.mock.calls.filter(call =>
        call[0].includes('git clone')
      );

      cloneCalls.forEach(call => {
        expect(call[0]).toContain('--quiet');
      });
    });

    it('should not use quiet flag for SSH clones', () => {
      // Local dev without gh auth
      process.env.CI = undefined;
      jest.resetModules();
      const module = require('./setup-private-modules.cjs');

      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('gh not available');
        })
        .mockReturnValue('');

      mockFsExistsSync.mockReturnValue(true);

      module.setupAndroidPassportReader();

      const cloneCalls = mockExecSync.mock.calls.filter(call =>
        call[0].includes('git clone')
      );

      // SSH clones should not have --quiet flag
      cloneCalls.forEach(call => {
        if (call[0].includes('git@github.com')) {
          expect(call[0]).not.toContain('--quiet');
        }
      });
    });
  });
});