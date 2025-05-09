import { shouldShowAesopRedesign } from '../../src/hooks/useAesopRedesign';
import { navigationScreens } from '../../src/navigation';

describe('useAesopRedesign', () => {
  describe('shouldShowAesopRedesign', () => {
    console.log(navigationScreens);

    it('should return false when IS_TEST_BUILD is false', () => {
      expect(shouldShowAesopRedesign()).toBe(false);
    });
  });
});
