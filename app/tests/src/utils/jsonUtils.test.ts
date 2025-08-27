// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { safeJsonParse, safeJsonStringify } from '@/utils/jsonUtils';

describe('JSON Utils', () => {
  describe('safeJsonParse', () => {
    it('should parse valid JSON correctly', () => {
      const validJson = '{"name": "test", "value": 123}';
      const result = safeJsonParse(validJson, null);

      expect(result).toEqual({ name: 'test', value: 123 });
    });

    it('should return default value for invalid JSON', () => {
      const invalidJson = '{"name": "test", "value": 123'; // Missing closing brace
      const defaultValue = { error: 'parsing failed' };
      const result = safeJsonParse(invalidJson, defaultValue);

      expect(result).toEqual(defaultValue);
    });

    it('should return default value for malformed JSON', () => {
      const malformedJson = 'not json at all';
      const defaultValue = null;
      const result = safeJsonParse(malformedJson, defaultValue);

      expect(result).toBe(defaultValue);
    });

    it('should handle empty string', () => {
      const emptyString = '';
      const defaultValue = {};
      const result = safeJsonParse(emptyString, defaultValue);

      expect(result).toEqual(defaultValue);
    });

    it('should handle null input', () => {
      const nullInput = null as any;
      const defaultValue = {};
      const result = safeJsonParse(nullInput, defaultValue);

      expect(result).toEqual(defaultValue);
    });
  });

  describe('safeJsonStringify', () => {
    it('should stringify valid objects correctly', () => {
      const obj = { name: 'test', value: 123 };
      const result = safeJsonStringify(obj);

      expect(result).toBe('{"name":"test","value":123}');
    });

    it('should return default value for objects with circular references', () => {
      const obj: any = { name: 'test' };
      obj.self = obj; // Create circular reference
      const defaultValue = '{"error": "circular reference"}';
      const result = safeJsonStringify(obj, defaultValue);

      expect(result).toBe(defaultValue);
    });

    it('should handle functions gracefully', () => {
      const obj = {
        name: 'test',
        func: () => 'test',
      };
      const result = safeJsonStringify(obj);

      // JSON.stringify omits functions, so we should get the object without the function
      expect(result).toBe('{"name":"test"}');
    });

    it('should handle undefined input', () => {
      const undefinedInput = undefined as any;
      const defaultValue = '{}';
      const result = safeJsonStringify(undefinedInput, defaultValue);

      expect(result).toBe(defaultValue);
    });

    it('should use default default value when not provided', () => {
      const obj: any = { func: () => 'test' };
      const result = safeJsonStringify(obj);

      expect(result).toBe('{}');
    });
  });
});
