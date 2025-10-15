// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useWindowDimensions } from 'react-native';

export const DEFAULT_COMPACT_WIDTH = 360;
export const DEFAULT_COMPACT_HEIGHT = 720;

interface UseCompactLayoutOptions {
  compactWidth?: number;
  compactHeight?: number;
}

const useCompactLayout = (
  options: UseCompactLayoutOptions = {},
): {
  width: number;
  height: number;
  isCompactWidth: boolean;
  isCompactHeight: boolean;
  isCompact: boolean;
} => {
  const { width, height } = useWindowDimensions();
  const compactWidth = options.compactWidth ?? DEFAULT_COMPACT_WIDTH;
  const compactHeight = options.compactHeight ?? DEFAULT_COMPACT_HEIGHT;

  const isCompactWidth = width < compactWidth;
  const isCompactHeight = height < compactHeight;

  return {
    width,
    height,
    isCompactWidth,
    isCompactHeight,
    isCompact: isCompactWidth || isCompactHeight,
  };
};

export default useCompactLayout;
