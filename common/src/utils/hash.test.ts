import { describe, expect, it } from 'vitest';

import { calculateUserIdentifierHash } from './hash';

describe('calculateUserIdentifierHash', () => {
  it('should return a bigint', () => {
    const result = calculateUserIdentifierHash(
      1,
      '550e8400-e29b-41d4-a716-446655440000',
      'some data'
    );
    expect(typeof result).toBe('bigint');
  });

  it('should return the same hash for identical inputs', () => {
    const destChainID = 42;
    const userID = 'abcdef12-3456-7890-abcd-ef1234567890';
    const userDefinedData = 'Test data';
    const hash1 = calculateUserIdentifierHash(destChainID, userID, userDefinedData);
    const hash2 = calculateUserIdentifierHash(destChainID, userID, userDefinedData);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatchInlineSnapshot(`525133570835708563534412370019423387022853755228n`);
  });

  it('should return different hash for different inputs', () => {
    const hash1 = calculateUserIdentifierHash(
      42,
      'abcdef12-3456-7890-abcd-ef1234567890',
      'Test data'
    );
    const hash2 = calculateUserIdentifierHash(
      42,
      'abcdef12-3456-7890-abcd-ef1234567890',
      'Different data'
    );
    expect(hash1).not.toBe(hash2);
    expect(hash1).toMatchInlineSnapshot(`525133570835708563534412370019423387022853755228n`);
  });
  it('should handle user ids starting with 0x', () => {
    const hash1 = calculateUserIdentifierHash(42, '0xabcdef1234567890', 'Test data');
    const hash2 = calculateUserIdentifierHash(42, 'abcdef1234567890', 'Test data');
    expect(hash1).toBe(hash2);
    expect(hash1).toMatchInlineSnapshot(`830654111289877969679298811043657652615780822337n`);
  });
});
