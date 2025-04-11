import { IS_TEST_BUILD } from '@env';

export const useAesopRedesign = (): boolean => {
  return IS_TEST_BUILD === 'true';
};
