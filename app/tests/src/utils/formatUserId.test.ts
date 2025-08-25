// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { formatUserId } from '@/utils/formatUserId';

describe('formatUserId', () => {
  // Test data constants for better maintainability
  const VALID_HEX_WITH_PREFIX = '0x1234567890abcdef1234567890abcdef12345678';
  const VALID_HEX_WITHOUT_PREFIX = 'abcdef1234567890abcdef1234567890abcdef1234';
  const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

  it('truncates hex addresses', () => {
    expect(formatUserId(VALID_HEX_WITH_PREFIX, 'hex')).toBe('0x12...5678');
  });

  it('adds prefix for hex without 0x', () => {
    expect(formatUserId(VALID_HEX_WITHOUT_PREFIX, 'hex')).toBe('0xab...1234');
  });

  it('returns uuid as is', () => {
    expect(formatUserId(VALID_UUID, 'uuid')).toBe(VALID_UUID);
  });

  it('returns null when userId is missing', () => {
    expect(formatUserId(null, 'hex')).toBeNull();
  });

  it('returns null for undefined userId', () => {
    expect(formatUserId(undefined, 'hex')).toBeNull();
  });

  it('returns null for undefined userId with uuid type', () => {
    expect(formatUserId(undefined, 'uuid')).toBeNull();
  });

  it('returns null for undefined userId with undefined type', () => {
    expect(formatUserId(undefined, undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(formatUserId('', 'hex')).toBeNull();
  });

  it('returns null for empty string with uuid type', () => {
    expect(formatUserId('', 'uuid')).toBeNull();
  });

  it('handles hex addresses that are too short', () => {
    const shortAddr = '0x123';
    expect(formatUserId(shortAddr, 'hex')).toBe('0x12...x123');
  });

  it('handles hex addresses that are too long', () => {
    const longAddr =
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678';
    expect(formatUserId(longAddr, 'hex')).toBe('0x12...5678');
  });

  it('handles hex without 0x that is too short', () => {
    const shortAddr = '123';
    expect(formatUserId(shortAddr, 'hex')).toBe('0x12...x123');
  });

  it('handles hex without 0x that is too long', () => {
    const longAddr =
      '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678';
    expect(formatUserId(longAddr, 'hex')).toBe('0x12...5678');
  });

  it('handles hex addresses with invalid characters', () => {
    const invalidHex = '0x1234567890abcdef1234567890abcdef1234567g';
    expect(formatUserId(invalidHex, 'hex')).toBe('0x12...567g');
  });

  it('handles hex without 0x with invalid characters', () => {
    const invalidHex = '1234567890abcdef1234567890abcdef1234567g';
    expect(formatUserId(invalidHex, 'hex')).toBe('0x12...567g');
  });

  it('returns malformed UUID as is', () => {
    const malformedUuid = '550e8400-e29b-41d4-a716-44665544000';
    expect(formatUserId(malformedUuid, 'uuid')).toBe(malformedUuid);
  });

  it('returns completely invalid UUID as is', () => {
    const invalidUuid = 'not-a-uuid-at-all';
    expect(formatUserId(invalidUuid, 'uuid')).toBe(invalidUuid);
  });

  it('returns UUID with wrong format as is', () => {
    const wrongFormatUuid = '550e8400e29b41d4a716446655440000';
    expect(formatUserId(wrongFormatUuid, 'uuid')).toBe(wrongFormatUuid);
  });

  it('handles mixed case hex addresses consistently', () => {
    const mixedCaseAddr = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12';
    expect(formatUserId(mixedCaseAddr, 'hex')).toBe('0xAb...Ef12');
  });

  it('handles mixed case hex without 0x consistently', () => {
    const mixedCaseAddr = 'AbCdEf1234567890AbCdEf1234567890AbCdEf12';
    expect(formatUserId(mixedCaseAddr, 'hex')).toBe('0xAb...Ef12');
  });

  it('handles all uppercase hex addresses', () => {
    const upperCaseAddr = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';
    expect(formatUserId(upperCaseAddr, 'hex')).toBe('0xAB...EF12');
  });

  it('returns hex address as is when type is undefined', () => {
    const addr = '0x1234567890abcdef1234567890abcdef12345678';
    expect(formatUserId(addr, undefined)).toBe(addr);
  });

  it('returns hex address as is when type is undefined for non-0x address', () => {
    const addr = 'abcdef1234567890abcdef1234567890abcdef1234';
    expect(formatUserId(addr, undefined)).toBe(addr);
  });

  it('returns UUID as is when type is undefined', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(formatUserId(uuid, undefined)).toBe(uuid);
  });

  it('handles hex type with non-hex string', () => {
    const nonHex = 'not-a-hex-string';
    expect(formatUserId(nonHex, 'hex')).toBe('0xno...ring');
  });

  it('handles uuid type with hex string', () => {
    const hexString = '0x1234567890abcdef1234567890abcdef12345678';
    expect(formatUserId(hexString, 'uuid')).toBe(hexString);
  });

  it('handles hex address with leading/trailing whitespace', () => {
    const addrWithWhitespace = '  0x1234567890abcdef1234567890abcdef12345678  ';
    expect(formatUserId(addrWithWhitespace, 'hex')).toBe('0x  ...78  ');
  });

  it('handles UUID with leading/trailing whitespace', () => {
    const uuidWithWhitespace = '  550e8400-e29b-41d4-a716-446655440000  ';
    expect(formatUserId(uuidWithWhitespace, 'uuid')).toBe(uuidWithWhitespace);
  });

  it('handles single character hex', () => {
    const singleChar = 'a';
    expect(formatUserId(singleChar, 'hex')).toBe('0xa...0xa');
  });

  it('handles two character hex', () => {
    const twoChar = 'ab';
    expect(formatUserId(twoChar, 'hex')).toBe('0xab...0xab');
  });

  it('handles three character hex', () => {
    const threeChar = 'abc';
    expect(formatUserId(threeChar, 'hex')).toBe('0xab...xabc');
  });

  describe('Security Edge Cases', () => {
    it('handles potential XSS attempts in user IDs', () => {
      const maliciousId = '<script>alert("xss")</script>';
      // For hex type, the function truncates and should not contain the full script tag
      expect(formatUserId(maliciousId, 'hex')).not.toContain('<script>');
      // For uuid type, the function returns as-is (which is correct behavior)
      expect(formatUserId(maliciousId, 'uuid')).toBe(maliciousId);
    });

    it('handles extremely long inputs without performance issues', () => {
      const longInput = 'a'.repeat(10000);
      expect(() => formatUserId(longInput, 'hex')).not.toThrow();
      expect(() => formatUserId(longInput, 'uuid')).not.toThrow();
    });

    it('handles special characters safely', () => {
      const specialChars = '\\n\\r\\t"\'`;DROP TABLE users;--';
      expect(() => formatUserId(specialChars, 'hex')).not.toThrow();
      expect(() => formatUserId(specialChars, 'uuid')).not.toThrow();
    });

    it('handles null bytes and control characters', () => {
      const nullBytes = '\x00\x01\x02\x03\x04\x05';
      expect(() => formatUserId(nullBytes, 'hex')).not.toThrow();
      expect(() => formatUserId(nullBytes, 'uuid')).not.toThrow();
    });

    it('handles unicode characters safely', () => {
      const unicodeChars =
        '🚀🎉💻🔥✨🎊🎈🎁🎂🎄🎃🎗️🎟️🎫🎪🎭🎨🎬🎤🎧🎼🎹🎸🎺🎻🥁🎷🎺🎻🎼🎹🎸🎤🎧🎼🎹🎸🎺🎻🥁🎷';
      expect(() => formatUserId(unicodeChars, 'hex')).not.toThrow();
      expect(() => formatUserId(unicodeChars, 'uuid')).not.toThrow();
    });
  });
});
