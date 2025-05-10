import { ProvingStateType } from '../../../src/utils/proving/provingMachine';
import { getLoadingScreenText } from '../../../src/utils/proving/stateLoadingScreenText';

describe('stateLoadingScreenText', () => {
  // Helper function to test a state has a response
  const testStateHasResponse = (state: ProvingStateType) => {
    it(`should return a response for ${state} state`, () => {
      const result = getLoadingScreenText(state);
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
      const result = getLoadingScreenText(undefined as ProvingStateType);
      expect(result).toBeDefined();
      expect(result.actionText).toBeDefined();
      expect(result.estimatedTime).toBeDefined();
    });

    it('should handle unknown state', () => {
      const result = getLoadingScreenText('unknown' as ProvingStateType);
      expect(result).toBeDefined();
      expect(result.actionText).toBeDefined();
      expect(result.estimatedTime).toBeDefined();
    });
  });
});
