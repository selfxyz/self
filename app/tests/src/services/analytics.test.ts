// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import analytics from '@/services/analytics';

// Mock the Segment client
jest.mock('@/config/segment', () => ({
  createSegmentClient: jest.fn(() => ({
    track: jest.fn(),
    screen: jest.fn(),
  })),
}));

describe('analytics', () => {
  const { trackEvent, trackScreenView } = analytics();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trackEvent', () => {
    it('should handle basic event tracking without properties', () => {
      expect(() => trackEvent('test_event')).not.toThrow();
    });

    it('should handle event tracking with valid properties', () => {
      const properties = {
        reason: 'test_reason',
        duration_seconds: 1.5,
        attempt_count: 3,
        string_prop: 'test',
        number_prop: 42,
        boolean_prop: true,
      };

      expect(() => trackEvent('test_event', properties)).not.toThrow();
    });

    it('should handle event tracking with null properties', () => {
      expect(() => trackEvent('test_event', null)).not.toThrow();
    });

    it('should handle event tracking with undefined properties', () => {
      expect(() => trackEvent('test_event', undefined)).not.toThrow();
    });

    it('should filter out non-JSON-compatible values', () => {
      const properties = {
        valid_string: 'test',
        valid_number: 42,
        valid_boolean: true,
        valid_null: null,
        function_prop: () => {},
        undefined_prop: undefined,
        symbol_prop: Symbol('test'),
      };

      expect(() => trackEvent('test_event', properties)).not.toThrow();
    });

    it('should handle nested objects and arrays', () => {
      const properties = {
        nested_object: {
          string: 'test',
          number: 42,
          boolean: true,
          null_value: null,
        },
        array_prop: ['string', 42, true, null],
        nested_array: [
          { id: 1, name: 'test' },
          { id: 2, name: 'test2' },
        ],
      };

      expect(() => trackEvent('test_event', properties)).not.toThrow();
    });

    it('should handle duration formatting correctly', () => {
      const properties = {
        duration_seconds: 1.23456789,
      };

      expect(() => trackEvent('test_event', properties)).not.toThrow();
    });

    it('should handle invalid duration values gracefully', () => {
      const properties = {
        duration_seconds: 'not_a_number',
      };

      expect(() => trackEvent('test_event', properties)).not.toThrow();
    });

    it('should handle complex nested structures', () => {
      const properties = {
        user: {
          id: 123,
          name: 'John Doe',
          preferences: {
            theme: 'dark',
            notifications: true,
            settings: {
              language: 'en',
              timezone: 'UTC',
            },
          },
        },
        metadata: {
          timestamp: Date.now(),
          version: '1.0.0',
          tags: ['test', 'analytics'],
        },
      };

      expect(() => trackEvent('test_event', properties)).not.toThrow();
    });

    it('should handle arrays with mixed types', () => {
      const properties = {
        mixed_array: [
          'string',
          42,
          true,
          null,
          { nested: 'object' },
          [1, 2, 3],
        ],
      };

      expect(() => trackEvent('test_event', properties)).not.toThrow();
    });

    it('should handle empty objects and arrays', () => {
      const properties = {
        empty_object: {},
        empty_array: [],
        nested_empty: {
          empty_obj: {},
          empty_arr: [],
        },
      };

      expect(() => trackEvent('test_event', properties)).not.toThrow();
    });
  });

  describe('trackScreenView', () => {
    it('should handle screen tracking without properties', () => {
      expect(() => trackScreenView('test_screen')).not.toThrow();
    });

    it('should handle screen tracking with properties', () => {
      const properties = {
        reason: 'navigation',
        duration_seconds: 5.2,
        user_id: 123,
      };

      expect(() => trackScreenView('test_screen', properties)).not.toThrow();
    });

    it('should handle screen tracking with complex properties', () => {
      const properties = {
        navigation: {
          from: 'home',
          to: 'settings',
          method: 'button_click',
        },
        user_context: {
          is_logged_in: true,
          subscription_tier: 'premium',
        },
      };

      expect(() => trackScreenView('test_screen', properties)).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle circular references gracefully', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      const properties = {
        circular_reference: circularObj,
        valid_prop: 'test',
      };

      expect(() => trackEvent('test_event', properties)).not.toThrow();
    });

    it('should handle very large numbers', () => {
      const properties = {
        large_number: Number.MAX_SAFE_INTEGER,
        small_number: Number.MIN_SAFE_INTEGER,
        float_number: 3.14159265359,
      };

      expect(() => trackEvent('test_event', properties)).not.toThrow();
    });

    it('should handle special string values', () => {
      const properties = {
        empty_string: '',
        unicode_string: '🚀🌟💫',
        special_chars: '!@#$%^&*()',
        newlines: 'line1\nline2\r\nline3',
        tabs: 'col1\tcol2\tcol3',
      };

      expect(() => trackEvent('test_event', properties)).not.toThrow();
    });

    it('should handle deeply nested structures', () => {
      const deepObj: any = {};
      let current = deepObj;

      // Create a deeply nested object
      for (let i = 0; i < 10; i++) {
        current.nested = { level: i };
        current = current.nested;
      }

      const properties = {
        deep_structure: deepObj,
        simple_prop: 'test',
      };

      expect(() => trackEvent('test_event', properties)).not.toThrow();
    });
  });
});
