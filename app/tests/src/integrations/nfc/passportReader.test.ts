// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Simple contract tests for PassportReader native module
 * These tests verify critical interface requirements without conditional expects
 */

import { PassportReader } from '@/integrations/nfc/passportReader';

describe('PassportReader Simple Contract Tests', () => {
  describe('Critical Interface Requirements', () => {
    it('should have scanPassport method (not scan)', () => {
      // This prevents the iOS "scan is undefined" bug
      expect(PassportReader.scanPassport).toBeDefined();
      expect(typeof PassportReader.scanPassport).toBe('function');
    });

    it('should NOT have scan method', () => {
      // This was the source of the iOS bug
      expect((PassportReader as any).scan).toBeUndefined();
    });

    it('should have reset method', () => {
      // This should always exist
      expect(PassportReader.reset).toBeDefined();
      expect(typeof PassportReader.reset).toBe('function');
    });

    it('should have scanPassport with correct parameter count', () => {
      // scanPassport should take exactly 9 parameters
      expect(PassportReader.scanPassport.length).toBe(9);
    });

    it('should allow configure to be optional', () => {
      // configure might not exist on Android - this should not crash
      const configureType = typeof PassportReader.configure;
      expect(['function', 'undefined']).toContain(configureType);
    });

    it('should allow trackEvent to be optional', () => {
      // trackEvent might not exist on all platforms
      const trackEventType = typeof PassportReader.trackEvent;
      expect(['function', 'undefined']).toContain(trackEventType);
    });

    it('should allow flush to be optional', () => {
      // flush might not exist on all platforms
      const flushType = typeof PassportReader.flush;
      expect(['function', 'undefined']).toContain(flushType);
    });
  });

  describe('Safe Method Calling Patterns', () => {
    it('should be safe to check configure existence', () => {
      // This pattern should never crash
      expect(() => {
        const hasConfigured = Boolean(PassportReader.configure);
        return hasConfigured;
      }).not.toThrow();
    });

    it('should be safe to check trackEvent existence', () => {
      // This pattern should never crash
      expect(() => {
        const hasTrackEvent = Boolean(PassportReader.trackEvent);
        return hasTrackEvent;
      }).not.toThrow();
    });

    it('should be safe to check flush existence', () => {
      // This pattern should never crash
      expect(() => {
        const hasFlush = Boolean(PassportReader.flush);
        return hasFlush;
      }).not.toThrow();
    });
  });

  describe('Method Invocation Safety', () => {
    it('should not crash when calling scanPassport', () => {
      // Should be callable (might fail due to missing NFC, but should not crash due to undefined)
      expect(() => {
        PassportReader.scanPassport(
          'test',
          'test',
          'test',
          'test',
          false,
          false,
          false,
          false,
          false,
        );
      }).not.toThrow(TypeError);
    });

    it('should not crash when calling reset', () => {
      // Should be callable
      expect(() => {
        PassportReader.reset();
      }).not.toThrow(TypeError);
    });
  });

  describe('Interface Consistency', () => {
    it('should have consistent method naming', () => {
      // Ensure we use the correct method names
      expect(PassportReader.scanPassport).toBeDefined(); // ✅ Correct
      expect((PassportReader as any).scan).toBeUndefined(); // ❌ Wrong (causes iOS crash)
    });

    it('should have proper method types', () => {
      // All defined methods should be functions
      expect(typeof PassportReader.reset).toBe('function');
      expect(typeof PassportReader.scanPassport).toBe('function');

      // Optional methods should be function or undefined
      expect(['function', 'undefined']).toContain(
        typeof PassportReader.configure,
      );
      expect(['function', 'undefined']).toContain(
        typeof PassportReader.trackEvent,
      );
      expect(['function', 'undefined']).toContain(typeof PassportReader.flush);
    });
  });
});
