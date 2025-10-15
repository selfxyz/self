// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback } from 'react';
import { useWindowDimensions } from 'react-native';

export const DEFAULT_COMPACT_WIDTH = 360;
export const DEFAULT_COMPACT_HEIGHT = 720;

interface UseCompactLayoutOptions {
  compactWidth?: number;
  compactHeight?: number;
}

type ResponsiveDimension = 'width' | 'height' | 'any';

interface ResponsivePaddingOptions {
  min?: number;
  max?: number;
  percent?: number;
}

const useCompactLayout = (
  options: UseCompactLayoutOptions = {},
): {
  width: number;
  height: number;
  isCompactWidth: boolean;
  isCompactHeight: boolean;
  isCompact: boolean;
  selectResponsiveValue: <T>(
    compactValue: T,
    regularValue: T,
    dimension?: ResponsiveDimension,
  ) => T;
  getResponsiveHorizontalPadding: (options?: ResponsivePaddingOptions) => number;
} => {
  const { width, height } = useWindowDimensions();
  const compactWidth = options.compactWidth ?? DEFAULT_COMPACT_WIDTH;
  const compactHeight = options.compactHeight ?? DEFAULT_COMPACT_HEIGHT;

  const isCompactWidth = width < compactWidth;
  const isCompactHeight = height < compactHeight;
  const selectResponsiveValue = useCallback(
    <T>(
      compactValue: T,
      regularValue: T,
      dimension: ResponsiveDimension = 'any',
    ): T => {
      if (dimension === 'width') {
        return isCompactWidth ? compactValue : regularValue;
      }

      if (dimension === 'height') {
        return isCompactHeight ? compactValue : regularValue;
      }

      return isCompactWidth || isCompactHeight ? compactValue : regularValue;
    },
    [isCompactHeight, isCompactWidth],
  );

  const getResponsiveHorizontalPadding = useCallback(
    (paddingOptions: ResponsivePaddingOptions = {}): number => {
      const { min = 16, max, percent = 0.06 } = paddingOptions;
      const computed = width * percent;
      const withMin = Math.max(min, computed);
      return typeof max === 'number' ? Math.min(max, withMin) : withMin;
    },
    [width],
  );

  return {
    width,
    height,
    isCompactWidth,
    isCompactHeight,
    isCompact: isCompactWidth || isCompactHeight,
    selectResponsiveValue,
    getResponsiveHorizontalPadding,
  };
};

export default useCompactLayout;
