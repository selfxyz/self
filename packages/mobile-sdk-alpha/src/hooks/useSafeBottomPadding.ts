// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useMemo } from 'react';
import { Dimensions } from 'react-native';

/**
 * Custom hook to calculate bottom padding that prevents UI elements from bleeding
 * into the system navigation area on smaller screens.
 *
 * This hook uses screen height detection to add extra padding for smaller screens
 * (< 900px height) to account for system navigation bars and safe areas.
 *
 * @param basePadding - Base padding to add (default: 20)
 * @returns Total bottom padding value
 *
 * @example
 * ```tsx
 * // For use with ExpandableBottomLayout.BottomSection
 * const bottomPadding = useSafeBottomPadding(20);
 * <ExpandableBottomLayout.BottomSection paddingBottom={bottomPadding} />
 * ```
 *
 */
export const useSafeBottomPadding = (basePadding: number = 20): number => {
  const { height: windowHeight } = Dimensions.get('window');

  return useMemo(() => {
    const isSmallScreen = windowHeight < 900;
    const fallbackPadding = isSmallScreen ? 50 : 0;
    return basePadding + fallbackPadding;
  }, [windowHeight, basePadding]);
};
