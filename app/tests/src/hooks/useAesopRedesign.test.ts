// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { renderHook } from '@testing-library/react-native';

import {
  shouldShowAesopRedesign,
  useAesopRedesign,
} from '@/hooks/useAesopRedesign';

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
