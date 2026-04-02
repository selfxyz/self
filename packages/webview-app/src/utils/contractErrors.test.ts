// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import {
  decodeContractError,
  formatErrorSignature,
  humanizeError,
  humanizeErrorAsync,
  isErrorSelector,
  lookupErrorSelector,
} from './contractErrors';

describe('contractErrors', () => {
  describe('decodeContractError', () => {
    it('should decode a known error selector', () => {
      expect(decodeContractError('0xda7bd3a6')).toBe('The verification and disclosure proof is invalid.');
    });

    it('should decode a selector with trailing encoded params', () => {
      expect(decodeContractError('0x6f26ab8d0000000000000000000000000000000000000000000000000000000066a8f1a0')).toBe(
        'The Aadhaar document timestamp is invalid.',
      );
    });

    it('should be case-insensitive for hex chars', () => {
      expect(decodeContractError('0xDA7BD3A6')).toBe('The verification and disclosure proof is invalid.');
    });

    it('should return null for an unknown selector', () => {
      expect(decodeContractError('0xdeadbeef')).toBeNull();
    });

    it('should return null for non-hex strings', () => {
      expect(decodeContractError('Something went wrong')).toBeNull();
      expect(decodeContractError('proof_failed')).toBeNull();
    });

    it('should return null for empty or short hex', () => {
      expect(decodeContractError('')).toBeNull();
      expect(decodeContractError('0x1234')).toBeNull();
    });

    it('should return null for falsy input', () => {
      expect(decodeContractError(undefined as unknown as string)).toBeNull();
      expect(decodeContractError(null as unknown as string)).toBeNull();
    });

    it('should decode REGISTERED_COMMITMENT', () => {
      expect(decodeContractError('0x034acfcc')).toBe('This identity has already been registered.');
    });

    it('should decode legacy V1 hub errors', () => {
      expect(decodeContractError('0xed8cf9ff')).toBe('The current date is outside the valid range for verification.');
    });
  });

  describe('humanizeError', () => {
    it('should return decoded message for a known selector', () => {
      expect(humanizeError('0xda7bd3a6')).toBe('The verification and disclosure proof is invalid.');
    });

    it('should return the original string for non-hex errors', () => {
      expect(humanizeError('Something went wrong')).toBe('Something went wrong');
    });

    it('should return the original string for unknown selectors', () => {
      expect(humanizeError('0xdeadbeef')).toBe('0xdeadbeef');
    });

    it('should pass through human-readable require messages', () => {
      expect(humanizeError('Proof verification failed')).toBe('Proof verification failed');
    });
  });

  describe('isErrorSelector', () => {
    it('should return true for valid selectors', () => {
      expect(isErrorSelector('0xda7bd3a6')).toBe(true);
      expect(isErrorSelector('0xDA7BD3A6')).toBe(true);
      expect(isErrorSelector('0xda7bd3a60000000000000000')).toBe(true);
    });

    it('should return false for non-selectors', () => {
      expect(isErrorSelector('hello')).toBe(false);
      expect(isErrorSelector('0x1234')).toBe(false);
      expect(isErrorSelector('')).toBe(false);
    });
  });

  describe('formatErrorSignature', () => {
    it('should split camelCase names', () => {
      expect(formatErrorSignature('InvalidVcAndDiscloseProof()')).toBe('Invalid Vc And Disclose Proof');
    });

    it('should format SCREAMING_SNAKE_CASE names', () => {
      expect(formatErrorSignature('REGISTERED_COMMITMENT()')).toBe('Registered Commitment');
    });

    it('should handle signatures with params', () => {
      expect(formatErrorSignature('InvalidUidaiTimestamp(uint256,uint256)')).toBe('Invalid Uidai Timestamp');
    });

    it('should handle simple names', () => {
      expect(formatErrorSignature('Overflow()')).toBe('Overflow');
    });

    it('should handle consecutive uppercase (acronyms)', () => {
      expect(formatErrorSignature('InvalidDSCProof()')).toBe('Invalid DSC Proof');
    });
  });

  describe('lookupErrorSelector', () => {
    it('should return a formatted name for a known selector', async () => {
      const result = await lookupErrorSelector('0xda7bd3a6');
      expect(result).toBe('Invalid Vc And Disclose Proof');
    });

    it('should return null for an unindexed selector', async () => {
      // Extremely unlikely to be indexed — random high-entropy selector
      const result = await lookupErrorSelector('0xffffff01');
      expect(result).toBeNull();
    });
  });

  describe('humanizeErrorAsync', () => {
    it('should return static map message for known selectors without API call', async () => {
      const result = await humanizeErrorAsync('0xda7bd3a6');
      expect(result).toBe('The verification and disclosure proof is invalid.');
    });

    it('should return original string for non-hex errors', async () => {
      const result = await humanizeErrorAsync('Something went wrong');
      expect(result).toBe('Something went wrong');
    });
  });
});
