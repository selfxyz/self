import { IS_TEST_BUILD } from '@env';

export const shouldUseAesopRedesign = (): boolean => {
  return IS_TEST_BUILD === 'true';
};

export const useAesopRedesign = (): boolean => {
  return shouldUseAesopRedesign();
};
