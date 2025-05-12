import { ProvingStateType } from '../../../src/utils/proving/provingMachine';
import {
  getLoadingScreenText,
  getProvingTimeEstimate,
  PassportMetadata,
} from '../../../src/utils/proving/stateLoadingScreenText';

describe('stateLoadingScreenText', () => {
  // Default metadata for basic tests
  const defaultMetadata: PassportMetadata = {
    signatureAlgorithm: 'RSA',
    curveOrExponent: '',
  };

  // Helper function to test a state has a response
  const testStateHasResponse = (state: ProvingStateType) => {
    it(`should return a response for ${state} state`, () => {
      const result = getLoadingScreenText(state, defaultMetadata);
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
        defaultMetadata,
      );
      expect(result).toBeDefined();
      expect(result.actionText).toBeDefined();
      expect(result.estimatedTime).toBeDefined();
    });

    it('should handle unknown state', () => {
      const result = getLoadingScreenText(
        'unknown' as ProvingStateType,
        defaultMetadata,
      );
      expect(result).toBeDefined();
      expect(result.actionText).toBeDefined();
      expect(result.estimatedTime).toBeDefined();
    });

    it('should handle undefined metadata', () => {
      const result = getLoadingScreenText(
        'proving',
        undefined as unknown as PassportMetadata,
      );
      expect(result).toBeDefined();
      expect(result.actionText).toBeDefined();
      expect(result.estimatedTime).toBe('30 - 90 SECONDS'); // Should use default time estimate
    });
  });

  describe('getLoadingScreenText with passport metadata', () => {
    const rsaMetadata: PassportMetadata = {
      signatureAlgorithm: 'RSA',
      curveOrExponent: '',
    };

    it('should use algorithm information to estimate proving time', () => {
      const result = getLoadingScreenText('proving', rsaMetadata);

      // Should use RSA (4 SECONDS)
      expect(result.estimatedTime).toBe('4 SECONDS');
    });
  });

  describe('getProvingTimeEstimate', () => {
    it('should return default time when metadata is undefined', () => {
      const result = getProvingTimeEstimate(undefined);
      expect(result).toBe('30 - 90 SECONDS');
    });

    it('should return correct time for RSA algorithm', () => {
      const metadata: PassportMetadata = {
        signatureAlgorithm: 'RSA',
        curveOrExponent: '',
      };

      const result = getProvingTimeEstimate(metadata);
      expect(result).toBe('4 SECONDS');
    });

    it('should return correct time for RSAPSS algorithm', () => {
      const metadata: PassportMetadata = {
        signatureAlgorithm: 'RSAPSS',
        curveOrExponent: '',
      };

      const result = getProvingTimeEstimate(metadata);
      expect(result).toBe('6 SECONDS');
    });

    describe('ECDSA curves', () => {
      it.each([['secp224r1'], ['brainpoolP224r1']])(
        'should return correct time for 224-bit curve %s',
        curve => {
          const metadata: PassportMetadata = {
            signatureAlgorithm: 'ECDSA',
            curveOrExponent: curve,
          };

          const result = getProvingTimeEstimate(metadata);
          expect(result).toBe('50 SECONDS');
        },
      );

      it.each([['secp256r1'], ['brainpoolP256r1']])(
        'should return correct time for 256-bit curve %s',
        curve => {
          const metadata: PassportMetadata = {
            signatureAlgorithm: 'ECDSA',
            curveOrExponent: curve,
          };

          const result = getProvingTimeEstimate(metadata);
          expect(result).toBe('50 SECONDS');
        },
      );

      it.each([['secp384r1'], ['brainpoolP384r1']])(
        'should return correct time for 384-bit curve %s',
        curve => {
          const metadata: PassportMetadata = {
            signatureAlgorithm: 'ECDSA',
            curveOrExponent: curve,
          };

          const result = getProvingTimeEstimate(metadata);
          expect(result).toBe('90 SECONDS');
        },
      );

      it.each([['secp521r1'], ['brainpoolP512r1']])(
        'should return correct time for 512/521-bit curve %s',
        curve => {
          const metadata: PassportMetadata = {
            signatureAlgorithm: 'ECDSA',
            curveOrExponent: curve,
          };

          const result = getProvingTimeEstimate(metadata);
          expect(result).toBe('200 SECONDS');
        },
      );
    });

    it('should return default time when algorithm is not recognized', () => {
      const metadata: PassportMetadata = {
        signatureAlgorithm: 'UNKNOWN_ALGORITHM',
        curveOrExponent: '',
      };

      const result = getProvingTimeEstimate(metadata);
      expect(result).toBe('30 - 90 SECONDS');
    });
  });
});
