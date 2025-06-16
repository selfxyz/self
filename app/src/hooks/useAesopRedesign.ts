import { IS_TEST_BUILD } from '@env';
import {
  setShowAesopRedesign,
  shouldShowAesopRedesign as isAesopRedesign,
} from '@selfxyz/ui/dist/utils/showAesopRedesign';

setShowAesopRedesign(JSON.parse(IS_TEST_BUILD ?? 'false'));

export const shouldShowAesopRedesign = (): boolean => {
  return isAesopRedesign();
};

export const useAesopRedesign = (): boolean => {
  return shouldShowAesopRedesign();
};
