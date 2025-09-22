// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

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
