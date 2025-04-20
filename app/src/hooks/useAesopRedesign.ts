import { IS_TEST_BUILD } from '@env';

export const shouldShowAesopRedesign = (): boolean => {
  return JSON.parse(IS_TEST_BUILD);
};

export const useAesopRedesign = (): boolean => {
  return shouldShowAesopRedesign();
};
