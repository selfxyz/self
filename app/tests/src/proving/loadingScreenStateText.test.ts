// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { ProvingStateType } from '@selfxyz/mobile-sdk-alpha';

import {
  getLoadingScreenText,
  getProvingTimeEstimate,
} from '@/proving/loadingScreenStateText';

describe('stateLoadingScreenText', () => {
  // Default values for basic tests
  const defaultSignatureAlgorithm = 'RSA';
  const defaultCurveOrExponent = '';
  const defaultType = 'register' as const;

  // Helper function to test a state has a response
  const testStateHasResponse = (state: ProvingStateType) => {
    it(`should return a response for ${state} state`, () => {
      const result = getLoadingScreenText(
        state,
        defaultSignatureAlgorithm,
        defaultCurveOrExponent,
        defaultType,
      );
      expect(result).toBeDefined();
      expect(result.actionText).toBeDefined();
      expect(result.actionText.length).toBeGreaterThan(0);
      expect(result.estimatedTime).toBeDefined();
      expect(result.estimatedTime.length).toBeGreaterThan(0);
    });
  };

  // Test all possible states
  const states: ProvingStateType[] = [
    'account_recovery_choice',
    'completed',
    'error',
    'failure',
    'fetching_data',
    'idle',
    'init_tee_connexion',
    'listening_for_status',
    'passport_data_not_found',
    'passport_not_supported',
    'post_proving',
    'proving',
    'ready_to_prove',
    'validating_document',
  ];

  describe('All states should have a response', () => {
    states.forEach(state => {
      testStateHasResponse(state);
    });
  });

  // Test edge cases
  describe('Edge cases', () => {
    it('should handle undefined state', () => {
      const result = getLoadingScreenText(
        undefined as ProvingStateType,
        defaultSignatureAlgorithm,
        defaultCurveOrExponent,
        defaultType,
      );
      expect(result).toBeDefined();
      expect(result.actionText).toBeDefined();
      expect(result.estimatedTime).toBeDefined();
    });

    it('should handle unknown state', () => {
      const result = getLoadingScreenText(
        'unknown' as ProvingStateType,
        defaultSignatureAlgorithm,
        defaultCurveOrExponent,
        defaultType,
      );
      expect(result).toBeDefined();
      expect(result.actionText).toBeDefined();
      expect(result.estimatedTime).toBeDefined();
    });

    it('should handle undefined metadata', () => {
      const result = getLoadingScreenText('proving', '', '', defaultType);
      expect(result).toBeDefined();
      expect(result.actionText).toBeDefined();
      expect(result.estimatedTime).toBe('30 - 90 SECONDS'); // Should use default time estimate
    });
  });

  describe('getLoadingScreenText with passport metadata', () => {
    const rsaSignatureAlgorithm = 'RSA';
    const rsaCurveOrExponent = '65537';

    it('should use algorithm information to estimate proving time', () => {
      const result = getLoadingScreenText(
        'proving',
        rsaSignatureAlgorithm,
        rsaCurveOrExponent,
        defaultType,
      );

      // Should use RSA (4 SECONDS)
      expect(result.estimatedTime).toBe('4 SECONDS');
    });
  });

  describe('getProvingTimeEstimate', () => {
    it('should return default time when parameters are undefined', () => {
      const result = getProvingTimeEstimate('', '', 'register');
      expect(result).toBe('30 - 90 SECONDS');
    });

    describe('RSA algorithms', () => {
      it.each([
        ['RSA', '65537', 'register', '4 SECONDS'], // Common RSA exponent
        ['RSA', '3', 'register', '4 SECONDS'], // Another common RSA exponent
        ['RSA', '65537', 'dsc', '2 SECONDS'], // DSC proof
        ['RSA', '3', 'dsc', '2 SECONDS'], // DSC proof
      ])(
        'should return correct time for %s with exponent %s and type %s',
        (algorithm, exponent, type, expectedTime) => {
          const result = getProvingTimeEstimate(
            algorithm,
            exponent,
            type as 'dsc' | 'register',
          );
          expect(result).toBe(expectedTime);
        },
      );

      it.each([
        ['RSAPSS', '65537', 'register', '6 SECONDS'],
        ['RSAPSS', '3', 'register', '6 SECONDS'],
        ['RSAPSS', '65537', 'dsc', '3 SECONDS'],
        ['RSAPSS', '3', 'dsc', '3 SECONDS'],
      ])(
        'should return correct time for %s with exponent %s and type %s',
        (algorithm, exponent, type, expectedTime) => {
          const result = getProvingTimeEstimate(
            algorithm,
            exponent,
            type as 'dsc' | 'register',
          );
          expect(result).toBe(expectedTime);
        },
      );
    });

    describe('ECDSA curves', () => {
      it.each([
        ['secp224r1', 'register', '50 SECONDS'],
        ['brainpoolP224r1', 'register', '50 SECONDS'],
        ['secp224r1', 'dsc', '25 SECONDS'],
        ['brainpoolP224r1', 'dsc', '25 SECONDS'],
      ])(
        'should return correct time for 224-bit curve %s with type %s',
        (curve, type, expectedTime) => {
          const result = getProvingTimeEstimate(
            'ECDSA',
            curve,
            type as 'dsc' | 'register',
          );
          expect(result).toBe(expectedTime);
        },
      );

      it.each([
        ['secp256r1', 'register', '50 SECONDS'],
        ['brainpoolP256r1', 'register', '50 SECONDS'],
        ['secp256r1', 'dsc', '25 SECONDS'],
        ['brainpoolP256r1', 'dsc', '25 SECONDS'],
      ])(
        'should return correct time for 256-bit curve %s with type %s',
        (curve, type, expectedTime) => {
          const result = getProvingTimeEstimate(
            'ECDSA',
            curve,
            type as 'dsc' | 'register',
          );
          expect(result).toBe(expectedTime);
        },
      );

      it.each([
        ['secp384r1', 'register', '90 SECONDS'],
        ['brainpoolP384r1', 'register', '90 SECONDS'],
        ['secp384r1', 'dsc', '45 SECONDS'],
        ['brainpoolP384r1', 'dsc', '45 SECONDS'],
      ])(
        'should return correct time for 384-bit curve %s with type %s',
        (curve, type, expectedTime) => {
          const result = getProvingTimeEstimate(
            'ECDSA',
            curve,
            type as 'dsc' | 'register',
          );
          expect(result).toBe(expectedTime);
        },
      );

      it.each([
        ['secp521r1', 'register', '200 SECONDS'],
        ['brainpoolP512r1', 'register', '200 SECONDS'],
        ['secp521r1', 'dsc', '100 SECONDS'],
        ['brainpoolP512r1', 'dsc', '100 SECONDS'],
      ])(
        'should return correct time for 512/521-bit curve %s with type %s',
        (curve, type, expectedTime) => {
          const result = getProvingTimeEstimate(
            'ECDSA',
            curve,
            type as 'dsc' | 'register',
          );
          expect(result).toBe(expectedTime);
        },
      );
    });

    it('should return default time when algorithm is not recognized', () => {
      const result = getProvingTimeEstimate(
        'UNKNOWN_ALGORITHM',
        '',
        'register',
      );
      expect(result).toBe('30 - 90 SECONDS');
    });
  });
});
