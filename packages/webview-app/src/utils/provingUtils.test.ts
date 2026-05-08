// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import {
  getFailureState,
  getGenerationStep,
  getIdCardProps,
  normalizeError,
  titleCaseDisclosure,
} from './provingUtils';

describe('provingUtils', () => {
  describe('getGenerationStep', () => {
    it('should map early states to readingRegistry', () => {
      expect(getGenerationStep('parsing_id_document')).toBe('readingRegistry');
      expect(getGenerationStep('fetching_data')).toBe('readingRegistry');
    });

    it('should map proving-phase states to generatingProof', () => {
      expect(getGenerationStep('validating_document')).toBe('generatingProof');
      expect(getGenerationStep('init_tee_connexion')).toBe('generatingProof');
      expect(getGenerationStep('ready_to_prove')).toBe('generatingProof');
      expect(getGenerationStep('proving')).toBe('generatingProof');
    });

    it('should map listening_for_status to awaitingVerification', () => {
      expect(getGenerationStep('listening_for_status')).toBe('awaitingVerification');
    });

    it('should map post_proving to finishingUp', () => {
      expect(getGenerationStep('post_proving')).toBe('finishingUp');
    });

    it('should default unknown states to readingRegistry', () => {
      expect(getGenerationStep('idle')).toBe('readingRegistry');
      expect(getGenerationStep('completed')).toBe('readingRegistry');
      expect(getGenerationStep('')).toBe('readingRegistry');
    });
  });

  describe('getFailureState', () => {
    it('should use provided code and reason', () => {
      expect(getFailureState('error', 'custom_code', 'Something broke')).toEqual({
        code: 'custom_code',
        message: 'Something broke',
      });
    });

    it('should fall back to currentState when code is null', () => {
      expect(getFailureState('failure', null, 'Reason')).toEqual({
        code: 'failure',
        message: 'Reason',
      });
    });

    it('should fall back to default message when reason is null', () => {
      expect(getFailureState('error', 'some_code', null)).toEqual({
        code: 'some_code',
        message: 'The proof request could not be completed.',
      });
    });

    it('should fall back to both defaults when code and reason are null', () => {
      expect(getFailureState('passport_not_supported', null, null)).toEqual({
        code: 'passport_not_supported',
        message: 'The proof request could not be completed.',
      });
    });
  });

  describe('getIdCardProps', () => {
    it('should return passport props by default', () => {
      expect(getIdCardProps()).toEqual({ variant: 'passport', title: 'Passport', subtitle: 'Biometric Passport' });
      expect(getIdCardProps('passport')).toEqual({
        variant: 'passport',
        title: 'Passport',
        subtitle: 'Biometric Passport',
      });
    });

    it('should return id-card props', () => {
      expect(getIdCardProps('id_card')).toEqual({ variant: 'id-card', title: 'ID Card', subtitle: 'Biometric Identification Card' });
    });

    it('should return aadhaar props', () => {
      expect(getIdCardProps('aadhaar')).toEqual({
        variant: 'aadhaar',
        title: 'Aadhaar',
        subtitle: 'Verified IN Aadhaar ID',
      });
    });

    it('should return kyc props', () => {
      expect(getIdCardProps('kyc')).toEqual({
        variant: 'pending',
        title: 'KYC Record',
        subtitle: 'Verification document loaded',
      });
    });

    it('should default to passport for unknown categories', () => {
      expect(getIdCardProps('drivers_license')).toEqual({
        variant: 'passport',
        title: 'Passport',
        subtitle: 'Biometric Passport',
      });
    });
  });

  describe('titleCaseDisclosure', () => {
    it('should convert underscored keys to title case', () => {
      expect(titleCaseDisclosure('full_name')).toBe('Full Name');
    });

    it('should convert hyphenated keys to title case', () => {
      expect(titleCaseDisclosure('date-of-birth')).toBe('Date Of Birth');
    });

    it('should handle mixed separators', () => {
      expect(titleCaseDisclosure('some_mixed-key')).toBe('Some Mixed Key');
    });

    it('should collapse multiple separators and whitespace', () => {
      expect(titleCaseDisclosure('full__name')).toBe('Full Name');
      expect(titleCaseDisclosure('  full_name  ')).toBe('Full Name');
    });

    it('should handle single word', () => {
      expect(titleCaseDisclosure('nationality')).toBe('Nationality');
    });
  });

  describe('normalizeError', () => {
    it('should return undefined for falsy input', () => {
      expect(normalizeError(undefined)).toBeUndefined();
      expect(normalizeError('')).toBeUndefined();
    });

    it('should wrap a string into a BridgeError', () => {
      expect(normalizeError('Something failed')).toEqual({
        code: 'proof_generation_failed',
        message: 'Something failed',
      });
    });

    it('should pass through a BridgeError object', () => {
      const err = { code: 'custom', message: 'msg' };
      expect(normalizeError(err)).toBe(err);
    });

    it('should preserve details on a BridgeError object', () => {
      const err = { code: 'custom', message: 'msg', details: { extra: true } };
      expect(normalizeError(err)).toBe(err);
    });
  });
});
