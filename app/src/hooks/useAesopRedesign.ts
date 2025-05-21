import { IS_TEST_BUILD } from '@env';

export const shouldShowAesopRedesign = (): boolean => {
  return IS_TEST_BUILD === 'true';
};

export const useAesopRedesign = (): boolean => {
  return shouldShowAesopRedesign();
};
