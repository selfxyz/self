import { renderHook } from '@testing-library/react-native';

import {
  shouldShowAesopRedesign,
  useAesopRedesign,
} from '../../../src/hooks/useAesopRedesign';

describe('useAesopRedesign', () => {
  describe('shouldShowAesopRedesign', () => {
    it('should return false when IS_TEST_BUILD is false', () => {
      expect(shouldShowAesopRedesign()).toBe(false);
    });
  });

  describe('useAesopRedesign hook', () => {
    it('should return the same value as shouldShowAesopRedesign', () => {
      const { result } = renderHook(() => useAesopRedesign());
      expect(result.current).toBe(shouldShowAesopRedesign());
    });
  });
});
