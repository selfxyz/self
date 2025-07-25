// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { formatUserId } from '../../../src/utils/formatUserId';

describe('formatUserId', () => {
  it('truncates hex addresses', () => {
    const addr = '0x1234567890abcdef1234567890abcdef12345678';
    expect(formatUserId(addr, 'hex')).toBe('0x12...5678');
  });

  it('adds prefix for hex without 0x', () => {
    const addr = 'abcdef1234567890abcdef1234567890abcdef1234';
    expect(formatUserId(addr, 'hex')).toBe('0xab...1234');
  });

  it('returns uuid as is', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(formatUserId(uuid, 'uuid')).toBe(uuid);
  });

  it('returns null when userId is missing', () => {
    expect(formatUserId(null, 'hex')).toBeNull();
  });
});
