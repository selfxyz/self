// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback } from 'react';
import { useWindowDimensions } from 'react-native';

// Figma reference screen width (iPhone 15 / standard design target)
const FIGMA_SCREEN_WIDTH = 393;
const MIN_SCALE = 0.85; // iPhone SE / small Android (~334px)
const MAX_SCALE = 1.15; // large phones (~452px)

export function useResponsiveScale() {
  const { width } = useWindowDimensions();
  const scale = Math.max(
    MIN_SCALE,
    Math.min(width / FIGMA_SCREEN_WIDTH, MAX_SCALE),
  );

  return useCallback((figmaPx: number) => figmaPx * scale, [scale]);
}

export default useResponsiveScale;
